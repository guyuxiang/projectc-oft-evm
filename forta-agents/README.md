 一个完整的Forta安全监控系统，包含区块链扫描器、告警处理器和通知服务，支持Discord和企业微信双通道告警推送。

 ## 🏗️ 系统架构

 ```
 ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 │   Blockchain    │───▶│  Forta Scanner   │───▶│  Alert Router   │
 │     Node        │    │                  │    │                 │
 └─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                        ┌─────────────────┐              │
                        │   NATS Queue    │◄─────────────┘
                        │                 │
                        └─────────────────┘
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
             ┌───────▼──┐  ┌────▼────┐  ┌──▼─────────┐
             │ Discord  │  │ WeChat  │  │ Other      │
             │ Webhook  │  │ Webhook │  │ Services   │
             └──────────┘  └─────────┘  └────────────┘
 ```

 ## 🚀 快速开始

 ### 1. 环境准备

 确保您的系统安装了以下组件：
 - Docker & Docker Compose
 - Git

 ### 2. 克隆项目

 ```bash
 git clone <repository-url>
 cd forta-agents
 ```

 ### 3. 配置告警通知

 #### 配置企业微信通知

 编辑 `forta-wechat/forta-wechat.yml`:

 ```yaml
 hooks:
   - slug: ethereum
     hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WECHAT_KEY
   - slug: polygon
     hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WECHAT_KEY
   - slug: lineasepolia
     hook: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WECHAT_KEY
 ```

 #### 配置Discord通知（可选）

 编辑 `forta-discord/forta-discord.yml`:

 ```yaml
 hooks:
   - slug: ethereum
     hook: https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK
   - slug: polygon
     hook: https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK
   - slug: lineasepolia
     hook: https://discord.com/api/webhooks/YOUR_DISCORD_WEBHOOK
 ```

 ### 4. 配置区块链网络

 编辑 `docker-compose.yml` 中的 `x-forta-config` 部分：

 ```yaml
 x-forta-config:
   chainId: 59141  # Linea Sepolia测试网

   scan:
     jsonRpc:
       url: https://linea-sepolia.gateway.tenderly.co/YOUR_KEY

   localMode:
     enable: true
     privateKeyHex: YOUR_PRIVATE_KEY  # 用于JWT签名
     logToStdout: true
     webhookUrl: http://forta-wechat:5002/hook/lineasepolia
 ```

 ### 5. 启动服务

 ```bash
 docker-compose up --remove-orphans --abort-on-container-exit
 ```

 ## 🔧 配置详解

 ### 服务组件

 | 服务名称 | 端口 | 功能描述 |
 |---------|------|----------|
 | `service-forta-nats` | 4222, 6222, 8222 | 消息队列服务 |
 | `forta-wechat` | 5002 | 企业微信告警推送 |
 | `forta-discord` | 5001 | Discord告警推送 |
 | `service-forta-json-rpc` | 8545 | 区块链JSON-RPC代理 |
 | `service-forta-scanner` | - | 区块链扫描器 |
 | `bot-1` | 50051 | 检测机器人实例 |

 ### 网络配置

 #### 支持的区块链网络

 - **以太坊主网** (chainId: 1)
 - **Polygon** (chainId: 137)
 - **Linea Sepolia** (chainId: 59141)
 - 其他EVM兼容网络

 #### JSON-RPC配置

 ```yaml
 scan:
   jsonRpc:
     url: https://your-rpc-endpoint.com
     # 可选配置
     timeout: 30s
     retries: 3
 ```

 ### 告警配置

 #### JWT签名密钥

 ```yaml
 localMode:
   privateKeyHex: "9e3c1e3ef3fc5669b6d469dafe2aa80b3986c5c59715ebcafb7e02076475a68c"
 ```

 ⚠️ **安全提醒**: 生产环境请使用您自己的私钥！

 #### Webhook路由

 告警会根据网络类型路由到不同的endpoint：

 - `/hook/ethereum` - 以太坊主网告警
 - `/hook/polygon` - Polygon网络告警
 - `/hook/lineasepolia` - Linea Sepolia测试网告警

 ### 区块范围限制（可选）

 ```yaml
 localMode:
   runtimeLimits:
     startBlock: 40293984  # 开始区块号
     stopBlock: 40293988   # 结束区块号
 ```

 ## 📊 监控Bot配置

 ### 现有检测规则

 项目包含多种安全检测规则：

 | 文件名 | 检测类型 | 描述 |
 |--------|----------|------|
 | `access.control.changes.js` | 权限控制 | 监控访问控制权限变更 |
 | `contract.upgrade.js` | 合约升级 | 检测智能合约升级事件 |
 | `govern.propose.js` | 治理提案 | 监控DAO治理提案 |
 | `high.gas.used.js` | Gas异常 | 检测异常高Gas使用 |
 | `high.mint.amount.js` | 铸币异常 | 监控大额代币铸造 |
 | `high.transfer.amount.js` | 转账异常 | 检测大额代币转账 |
 | `low.eth.balance.js` | 余额告警 | 监控关键地址低余额 |
 | `ownership.changes.js` | 所有权变更 | 检测合约所有权转移 |
 | `tx.failed.js` | 交易失败 | 监控重要交易失败 |

 ### Bot参数配置

 在 `src/paramConfig.json` 中配置检测参数：

 ```json
 {
   "HIGH_GAS_THRESHOLD": 1000000,
   "HIGH_MINT_THRESHOLD": "1000000000000000000000",
   "HIGH_TRANSFER_THRESHOLD": "10000000000000000000000",
   "LOW_ETH_BALANCE_THRESHOLD": "1000000000000000000",
   "MONITORED_CONTRACTS": [
     "0x1234567890123456789012345678901234567890"
   ]
 }
 ```

 ### 添加新的检测Bot

 1. 在 `src/` 目录下创建新的JS文件
 2. 实现检测逻辑
 3. 更新 `agent.js` 导入新规则
 4. 重新构建和部署

 ## 🔍 告警格式

 ### 企业微信告警示例

 ```markdown
 🚨 Forta 安全告警

 告警ID: ALERT-123456
 名称: High Value Transfer Detected
 严重程度: 🔴 HIGH
 类型: 🤔 SUSPICIOUS
 协议: ethereum
 描述: 检测到大额代币转账，金额超过阈值

 区块: 18500000
 交易: 0x1234567890abcdef...

 涉及地址:
 - 0x742d35Cc6634C0532925a3b8D4141d6E19C3a2d1
 - 0xa0b86a33e6a4b1d4b1f2b4b1e4b1f4b1e4b1f4b1

 时间: 2024-01-15 14:30:25
 ```

 ### Discord告警示例

 Discord告警使用Embed格式，包含颜色编码和结构化字段。

## 本地测试
全局forta.config.yml文件在/root/.forta下，并包含了forta密码文件
如果当前目录下也可存在forta.config.yml会优先使用该目录下的配置
forta.config.ym需要配置好区块链节点RPC
启动本地测试
npm start

Discord告警使用Embed格式，包含颜色编码和结构化字段。

 ## 🐳 部署选项

 ### Docker Compose部署（推荐）

 ```bash
 # 启动所有服务
 docker-compose up -d

 # 查看日志
 docker-compose logs -f

 # 停止服务
 docker-compose down
 ```

 ### 单独构建镜像

 ```bash
 # 构建Forta节点
 docker build -t forta-network/forta-node:latest -f forta-node/Dockerfile.node ./forta-node

 # 构建检测Bot
 docker build -t my-forta-bot:latest .

 # 构建企业微信服务
 docker build -t forta-wechat:latest ./forta-wechat
 ```

 ### Kubernetes部署

 创建 `k8s-deployment.yaml`:

 ```yaml
 apiVersion: apps/v1
 kind: Deployment
 metadata:
   name: forta-scanner
 spec:
   replicas: 1
   selector:
     matchLabels:
       app: forta-scanner
   template:
     metadata:
       labels:
         app: forta-scanner
     spec:
       containers:
       - name: scanner
         image: forta-network/forta-node:latest
         command: ["/forta-node", "scanner"]
         env:
         - name: FORTA_CHAIN_ID
           value: "59141"
         volumeMounts:
         - name: config
           mountPath: /.forta
       volumes:
       - name: config
         configMap:
           name: forta-config
 ```

 ## 🔧 故障排除

 ### 常见问题

 #### 1. 告警未发送到企业微信

 **症状**: 控制台显示告警处理成功，但企业微信未收到消息

 **排查步骤**:
 ```bash
 # 检查企业微信服务状态
 docker-compose logs forta-wechat

 # 检查webhook URL是否正确
 curl -X POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY \
   -H 'Content-Type: application/json' \
   -d '{"msgtype":"text","text":{"content":"测试消息"}}'

 # 检查网络连接
 docker exec forta-wechat ping qyapi.weixin.qq.com
 ```

 #### 2. Scanner连接失败

 **症状**: `service-forta-scanner` 无法连接到JSON-RPC节点

 **解决方案**:
 ```bash
 # 检查JSON-RPC配置
 docker-compose logs service-forta-json-rpc

 # 测试RPC连接
 curl -X POST https://your-rpc-endpoint.com \
   -H 'Content-Type: application/json' \
   -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
 ```

 #### 3. Bot无法启动

 **症状**: Bot容器启动失败或立即退出

 **排查步骤**:
 ```bash
 # 查看Bot日志
 docker-compose logs bot-1

 # 检查Bot配置
 docker exec bot-1 cat /app/src/paramConfig.json

 # 检查依赖服务
 docker-compose ps
 ```

 ### 日志分析

 #### 关键日志位置

 - **Scanner日志**: `docker-compose logs service-forta-scanner`
 - **Bot日志**: `docker-compose logs bot-1`
 - **通知服务日志**: `docker-compose logs forta-wechat`
 - **NATS日志**: `docker-compose logs service-forta-nats`

 #### 日志级别配置

 在 `docker-compose.yml` 中调整日志级别：

 ```yaml
 x-forta-config:
   localMode:
     logToStdout: true
     logLevel: "debug"  # trace, debug, info, warn, error
 ```

 ### 性能优化

 #### 资源限制

 ```yaml
 services:
   service-forta-scanner:
     deploy:
       resources:
         limits:
           memory: 2G
           cpus: '1.0'
         reservations:
           memory: 1G
           cpus: '0.5'
 ```

 #### 批量处理配置

 ```yaml
 x-forta-config:
   localMode:
     batchSize: 100
     batchTimeout: 10s
 ```

 ## 📈 监控和观察

 ### 健康检查端点

 | 服务 | 端点 | 描述 |
 |------|------|------|
 | forta-wechat | `http://localhost:5002/health` | 企业微信服务状态 |
 | forta-discord | `http://localhost:5001/health` | Discord服务状态 |
 | service-forta-json-rpc | `http://localhost:8545` | JSON-RPC代理状态 |

 ### 指标收集

 系统支持Prometheus指标收集：

 ```bash
 # 获取指标
 curl http://localhost:9090/metrics
 ```

 ### 告警统计

 查看告警处理统计：

 ```bash
 # 企业微信发送统计
 docker-compose logs forta-wechat | grep "alerts sent"

 # Discord发送统计
 docker-compose logs forta-discord | grep "embeds sent"
 ```

 ## 🔒 安全注意事项

 ### 密钥管理

 1. **JWT私钥**: 生产环境使用独立的私钥
 2. **Webhook URL**: 避免在日志中暴露完整URL
 3. **RPC端点**: 使用认证的私有节点

 ### 网络安全

 1. **防火墙规则**: 仅开放必要端口
 2. **TLS加密**: 所有外部通信使用HTTPS
 3. **访问控制**: 限制容器间不必要的网络访问

 ### 配置安全

 ```yaml
 # 使用环境变量存储敏感信息
 environment:
   - WEBHOOK_URL=${WEBHOOK_URL}
   - PRIVATE_KEY=${PRIVATE_KEY}
   - RPC_URL=${RPC_URL}
 ```

 ## 🚀 扩展开发

 ### 添加新的通知渠道

 1. 创建新的服务目录（如 `forta-telegram`）
 2. 实现webhook处理器
 3. 在 `docker-compose.yml` 中添加服务配置
 4. 更新路由配置

 ### 自定义检测规则

 ```javascript
 // src/custom-detector.js
 module.exports = {
   name: "Custom Security Detector",
   description: "Detects custom security patterns",

   handleTransaction(transaction) {
     // 实现检测逻辑
     if (isSecurityThreat(transaction)) {
       return {
         name: "Custom Security Alert",
         description: "Detected custom security threat",
         severity: "HIGH",
         type: "EXPLOIT"
       };
     }
     return null;
   }
 };
 ```

 ## 📚 参考资源

 - [Forta Network 官方文档](https://docs.forta.network/)
 - [企业微信机器人API](https://developer.work.weixin.qq.com/document/path/91770)
 - [Discord Webhook指南](https://support.discord.com/hc/en-us/articles/228383668)
 - [Docker Compose 参考](https://docs.docker.com/compose/)

 ## 🤝 贡献指南

 欢迎提交Issue和Pull Request来改进项目！

 ### 开发环境搭建

 ```bash
 git clone <repository-url>
 cd forta-agents
 npm install
 ```

 ### 提交规范

 - 使用清晰的提交消息
 - 添加相应的测试用例
 - 更新相关文档

 ## 📄 许可证

 MIT License - 查看 [LICENSE.md](LICENSE.md) 获取详细信息。

 ---

 **联系我们**: 如有问题或建议，请通过Issue与我们联系。
