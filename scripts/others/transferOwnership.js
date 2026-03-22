const { ethers } = require("hardhat");
const db = require("../flowCli/db");

async function transferOwnershipForAll(newOwner) {
  if (!newOwner || !ethers.isAddress(newOwner)) {
    throw new Error("Invalid new owner address");
  }

  const address = await db.read();
  console.log("all address", address);

  const [signer] = await ethers.getSigners();
  console.log(`当前部署者地址: ${signer.address}`);

  // UserPermission角色转移函数
  async function transferUserPermissionRoles(newAdmin) {
    try {
      const UserPermissionContract = await ethers.getContractAt(
        "UserPermission",
        address["UserPermission"].address,
      );

      console.log(
        `处理UserPermission合约角色转移: ${address["UserPermission"].address}`,
      );

      // 获取DEFAULT_ADMIN_ROLE
      const DEFAULT_ADMIN_ROLE =
        await UserPermissionContract.DEFAULT_ADMIN_ROLE();
      const OPERATOR = await UserPermissionContract.OPERATOR();

      // 检查当前部署者是否具有DEFAULT_ADMIN_ROLE
      const hasAdminRole = await UserPermissionContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        signer.address,
      );

      if (!hasAdminRole) {
        console.log(
          `当前地址 ${signer.address} 不具有DEFAULT_ADMIN_ROLE，无法转移角色`,
        );
        return false;
      }

      // 检查是否需要转移OPERATOR角色
      const hasOperatorRole = await UserPermissionContract.hasRole(
        OPERATOR,
        signer.address,
      );
      if (hasOperatorRole) {
        console.log(`授予 ${newAdmin} OPERATOR角色...`);
        const grantOperatorTx = await UserPermissionContract.grantRole(
          OPERATOR,
          newAdmin,
        );
        await grantOperatorTx.wait();
        console.log(`✅ 已授予OPERATOR角色: ${grantOperatorTx.hash}`);

        // 撤销当前部署者的OPERATOR角色
        console.log(`撤销部署者的OPERATOR角色...`);
        const revokeOperatorTx = await UserPermissionContract.renounceRole(
          OPERATOR,
          signer.address,
        );
        await revokeOperatorTx.wait();
        console.log(`已撤销当前部署者的OPERATOR角色: ${revokeOperatorTx.hash}`);
      } else {
        console.log(`当前部署者没有OPERATOR角色，跳过OPERATOR角色转移`);
      }

      // 授予新管理员DEFAULT_ADMIN_ROLE
      console.log(`授予 ${newAdmin} DEFAULT_ADMIN_ROLE...`);
      const grantAdminTx = await UserPermissionContract.grantRole(
        DEFAULT_ADMIN_ROLE,
        newAdmin,
      );
      await grantAdminTx.wait();
      console.log(`✅ 已授予DEFAULT_ADMIN_ROLE: ${grantAdminTx.hash}`);

      // 撤销当前部署者的DEFAULT_ADMIN_ROLE
      console.log(`撤销当前部署者的DEFAULT_ADMIN_ROLE...`);
      const revokeAdminTx = await UserPermissionContract.renounceRole(
        DEFAULT_ADMIN_ROLE,
        signer.address,
      );
      await revokeAdminTx.wait();
      console.log(
        `✅ 已撤销当前部署者的DEFAULT_ADMIN_ROLE: ${revokeAdminTx.hash}`,
      );
      return true;
    } catch (error) {
      console.error(`❌ UserPermission角色转移失败: ${error.message}`);
      return false;
    }
  }

  const contracts = [
    { name: "DTTERC20", address: address["GLSGD"].address },
    { name: "DTTERC20", address: address["GLUSD"].address },
    { name: "Encash", address: address["Encash"].address },
    { name: "RORERC721", address: address["RORERC721"].address },
    {
      name: "TransactionIDFactory",
      address: address["TransactionIDFactory"].address,
    },
    { name: "RorEnhancement", address: address["RorEnhancement"].address },
    { name: "RorMarket", address: address["RorMarket"].address },
    {
      name: "Config",
      address: address["Config"].address,
    },
    {
      name: "DigitalTokenTradeDiamond",
      address: address["DigitalTokenTradeDiamond"].address,
    },
  ];

  if (contracts.length === 0) {
    console.log("没有找到可转移所有权的合约");
    return;
  }

  console.log(` ${contracts.length} 个合约需要转移所有权:`);
  contracts.forEach((contract) => {
    console.log(`- ${contract.name}: ${contract.address}`);
  });

  // 确认转移
  console.log(`准备将所有合约的所有权转移到: ${newOwner}`);
  console.log("请确认以上操作...");

  for (const contract of contracts) {
    try {
      const ContractC = await ethers.getContractAt(
        contract.name,
        contract.address,
      );
      const currentOwner = await ContractC.owner();
      console.log(`${contract.name}合约当前所有者: ${currentOwner}`);

      if (currentOwner.toLowerCase() === signer.address.toLowerCase()) {
        const tx = await ContractC.transferOwnership(newOwner);
        const receipt = await tx.wait();
        if (!receipt.status) {
          throw Error(`${contract.name}所有权转移交易失败: ${tx.hash}`);
        } else {
          console.log(`${contract.name} 所有权转移成功: ${tx.hash}`);
        }
      } else {
        console.log(`${contract.name}当前所有者不是部署者, 无法转移所有权`);
      }
    } catch (error) {
      console.error(`❌ ${contract.name} 所有权转移失败: ${error.message}`);
    }
  }

  console.log(`处理UserPermission合约角色转移...`);
  await transferUserPermissionRoles(newOwner);
}

async function main() {
  const newOwner = ""; // 在此设置预期的所有者地址
  if (newOwner === "") {
    console.error("请设置新所有者地址");
    process.exit(1);
  }

  try {
    await transferOwnershipForAll(newOwner);
  } catch (error) {
    console.error("转移所有权失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
