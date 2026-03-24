# projectc-oft-evm

这个仓库是 EVM 侧稳定币 OFT 实现。它的目标不是单独完成一条业务链，而是和 `projectc-oft-solana` 共同组成一套 `Sepolia <-> Solana Devnet` 的双向稳定币跨链系统。

当前实现基于：

- `DTTERC20.sol`
- `@layerzerolabs/oft-evm-upgradeable`
- UUPS proxy
- LayerZero Endpoint V2

这份 README 重点解释：

- 这个仓库在整套跨链系统里负责什么
- EVM 侧 OFT 的关键概念和组件
- 跨链消息在 EVM 侧是怎么 burn / mint 的
- 为什么原来的稳定币权限逻辑还保留
- 实际工程入口和部署流程

## 1. 项目定位

整套系统分两边：

- EVM 侧：`projectc-oft-evm`
- Solana 侧：`projectc-oft-solana`

EVM 侧负责：

- 在 Sepolia 上提供一个可升级的 OFT ERC20
- 作为 Solana 侧 OFT 的 remote peer
- 在 `Sepolia -> Solana` 时负责 burn
- 在 `Solana -> Sepolia` 时负责 mint
- 在发出和接收时继续执行你原有的稳定币合规约束

所以这里不是“重新造一个新币”，而是把已有 `DTTERC20` 稳定币升级成可以参与 OFT 跨链的版本。

## 2. 核心概念

### 2.1 OFT

OFT 是 LayerZero 的 Omnichain Fungible Token 标准。它的核心目标不是“桥接一份映射资产”，而是让一份逻辑上的同一资产可以跨链移动。

这套项目采用的是：

- `burn / mint`
- 不做 lock / unlock

也就是说，跨链不是把 Sepolia 上的 token 锁起来再在 Solana 放出 escrow token，而是：

1. 源链把用户 token 销毁
2. 通过 LayerZero 发送消息
3. 目标链接收消息后重新铸造同等数量 token

这样做的好处是：

- 总供应量在多链之间保持一致
- 不需要额外维护桥接资产或封装资产
- 更适合自发行稳定币

### 2.2 Endpoint / EID / Peer

LayerZero 的几个基础概念：

- `EndpointV2`
  - 每条链上的 LayerZero 协议入口合约或程序
- `EID`
  - LayerZero 对每条链定义的 endpoint id
  - Sepolia 是 `40161`
  - Solana Devnet 是 `40168`
- `Peer`
  - 远端对等 OApp / OFT 地址
  - EVM 侧需要知道 Solana 侧 `oft_store`
  - Solana 侧需要知道 EVM 侧 OFT proxy 地址

如果 peer 没有正确配置：

- 消息不会被目标 OApp 接受
- 或者直接在协议层被拒绝

### 2.3 Enforced Options

LayerZero 消息执行不是“裸消息”，还要附带执行参数。这里最重要的是：

- 目标链执行 `lzReceive` 需要多少 gas / compute units
- 目标链是否需要额外 native token 支付 rent

在这套系统里：

- `EVM -> Solana`
  - 需要给 Solana 接收侧 `lz_receive` 分配 compute budget
  - 需要额外给首次创建 ATA 的 rent
- `Solana -> EVM`
  - 需要给 EVM 接收侧 `lzReceive` 分配 gas

因此 peer wiring 不只是“互相记住地址”，还包括给每个方向配置合适的 enforced options。

## 3. EVM 侧核心组件

### 3.1 `DTTERC20.sol`

核心文件是 [`DTTERC20.sol`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/contracts/token/DTTERC20.sol)。

这个合约同时具备三层职责：

- ERC20 稳定币
- 你原有的权限和合规模型
- OFT 跨链接口

它继承了：

- `OFTUpgradeable`
- `ERC20PermitUpgradeable`
- `UUPSUpgradeable`
- `TokenPermission`

### 3.2 为什么原稳定币逻辑没有删

跨链不是一个独立于业务的壳，而是稳定币的一种转移方式。所以原有逻辑仍然要生效：

- `issuer`
- `mintPermit`
- `mintLimit`
- `Config`
- `UserPermission`
- `CreditDoor* / DebitDoor`
- `paused`

这意味着：

- 本地转账受控
- 本地 mint / burn 受控
- 跨链发出也受控
- 跨链接收铸币也受控

### 3.3 `_debit` 和 `_credit`

OFT 在 EVM 侧最关键的两个内部钩子：

- `_debit`
  - 在源链发送时执行
  - 这里会真正减少源链 token
- `_credit`
  - 在目标链接收时执行
  - 这里会真正给目标地址增加 token

在当前实现里：

- `_debit(...)`
  - 额外挂了 `DebitDoor`
  - 表示不是谁都能把稳定币跨出去
- `_credit(...)`
  - 额外挂了 `CreditDoorMint`
  - 表示不是谁都能在 EVM 侧通过跨链被 mint 到账

这就是“跨链继续服从合规规则”的落点。

## 4. 跨链设计

### 4.1 为什么这里是 burn / mint

EVM 侧和 Solana 侧表示的是同一份稳定币总量，因此需要满足：

- 源链发送时减少总量
- 目标链接收时增加总量

如果做 lock / unlock：

- 你要维护桥接库存
- Solana 侧还要处理 escrow / adapter
- 业务上变成“托管资产解锁”，不是“原生资产跨链”

所以这里统一采用：

- 源链 burn
- 目标链 mint

### 4.2 一次 `Sepolia -> Solana` 的实际时序

1. 用户在 Sepolia 调用 OFT `send`
2. `DTTERC20._debit` 执行
3. `DebitDoor` 校验发出地址是否允许跨链
4. Sepolia 上 token 被 burn
5. LayerZero Endpoint 发出跨链消息
6. Solana 侧 OFT program 接收到消息
7. Solana 侧验证 peer、nonce、path config
8. Solana 侧给目标 ATA mint token

### 4.3 一次 `Solana -> Sepolia` 的实际时序

1. 用户在 Solana 调用 OFT `send`
2. Solana 侧 program 把 token burn
3. LayerZero 发出消息
4. Sepolia OFT 收到消息
5. `DTTERC20._credit` 执行
6. `CreditDoorMint` 校验目标地址是否允许被铸币
7. EVM 侧 mint token 到目标地址

## 5. 关键工程文件

### 5.1 合约

- [`DTTERC20.sol`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/contracts/token/DTTERC20.sol)
  - EVM 侧 OFT 稳定币主体

### 5.2 脚本

- [`deploySepolia.js`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/scripts/layerzero/deploySepolia.js)
  - 部署 UUPS proxy
  - 可选写入 `Config / issuer / mint licensor / mint limit`
- [`wireSepoliaToSolana.js`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/scripts/layerzero/wireSepoliaToSolana.js)
  - 设置 delegate
  - 设置 Solana peer
  - 设置 `EVM -> Solana` enforced options
- [`sendSepoliaToSolana.js`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/scripts/layerzero/sendSepoliaToSolana.js)
  - 报价
  - 发送
  - 轮询 Solana 余额验证到账
- [`utils.js`](/Users/guyuxiang/Documents/omnichain/projectc-oft-evm/scripts/layerzero/utils.js)
  - 部署文件读写
  - Solana 地址转 bytes32
  - Solana RPC 查询

### 5.3 部署产物

- `deployments/sepolia/OFT.json`

这个文件是 EVM 侧工程化入口的状态快照，包含：

- `proxy`
- `implementation`
- `endpointV2`
- `delegate`
- `tokenIssuer`
- `tokenMintLicensor`
- `mintLimit`
- `remote`

其中 `remote` 记录当前对接的 Solana 侧信息。

## 6. 配置与部署流程

### 6.1 编译

```bash
npm install
npm run compile
```

### 6.2 部署 OFT

```bash
npm run lz:deploy:sepolia
```

如果要顺手把业务参数初始化：

```bash
CONFIG_ADDRESS=<config> \
TOKEN_ISSUER=<issuer> \
TOKEN_MINT_LICENSOR=<licensor> \
TOKEN_MINT_LIMIT=5000000000000000000000000 \
npm run lz:deploy:sepolia
```

### 6.3 配对 Solana Peer

默认会自动读取 `../projectc-oft-solana/deployments/solana-testnet/OFT.json`。

```bash
npm run lz:wire:solana
```

这一步会做：

1. 设置 EVM delegate
2. 设置 Solana peer
3. 设置 `EVM -> Solana` enforced options

### 6.4 发币到 Solana

```bash
SOLANA_RECIPIENT=<solana_wallet> \
AMOUNT=1 \
npm run lz:send:solana
```

## 7. 设计取舍

### 7.1 为什么合约还要保持 UUPS

因为你原有稳定币就是升级式系统，跨链能力只是新能力，不应该打破：

- 升级权限
- 既有存储布局
- 原治理方式

所以当前做法是把 OFT 合并进升级版 `DTTERC20`，而不是另起一个全新 token 合约。

### 7.2 为什么 constructor 还保留

虽然代理逻辑主要在 `initialize()`，但 `OFTUpgradeable` 的 endpoint 是通过 constructor 里的 immutable 设置的，所以这里不能把 constructor 完全删掉。

### 7.3 为什么发币脚本要轮询目标链余额

因为跨链成功不等于源链 tx 成功。真正业务上关心的是：

- 源链是否扣掉
- 目标链是否到账

因此发送脚本在源链提交后，还会继续轮询目标链余额作为结果验证。

## 8. 常见问题

### 8.1 为什么 wire 不能只配地址

因为 LayerZero 执行消息时还需要：

- 目标链 gas / CU
- 目标链可能需要的 native token

地址只解决“发给谁”，enforced options 解决“怎么执行”。

### 8.2 为什么跨链接收还要经过 `CreditDoorMint`

因为从业务角度看，跨链接收本质上仍然是一次 mint。既然是 mint，就应该继续遵守稳定币准入约束。

### 8.3 为什么源链要先 burn，再等目标链 mint

因为这套系统表示的是同一份资产的跨链移动，而不是复制一份 token。如果不先 burn，总量会膨胀。

## 9. 与 Solana 仓库的关系

EVM 侧只关心这几个 Solana 信息：

- `oft_store`
- `mint`
- Solana RPC
- Solana EID

Solana 侧只关心这几个 EVM 信息：

- OFT proxy 地址
- EndpointV2
- Sepolia RPC
- Sepolia EID

两边通过各自 `deployments/.../OFT.json` 互相读取，形成一个可以重复部署、重复配对、重复发送的闭环。
