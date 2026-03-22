const { ethers } = require("hardhat");
const db = require("../flowCli/db");

// 脚本功能:
// 1. 合约所有权验证 - 检查所有合约的owner是否为指定地址
// 2. UserPermission角色验证 - 验证DEFAULT_ADMIN_ROLE和OPERATOR角色成员
// 3. 详细报告生成 - 输出完整的验证报告包含统计信息和失败详情
//
// 使用方法:
// 在脚本中设置 expectedOwner 变量为目标地址

async function verifyOwnershipAndRoles(expectedOwner) {
  if (!expectedOwner || !ethers.isAddress(expectedOwner)) {
    throw new Error("Invalid expected owner address");
  }

  const address = await db.read();
  console.log("合约权限转移验证报告");
  console.log(`预期所有者/管理员地址: ${expectedOwner}\n`);

  const verificationResults = [];

  // 定义需要验证的合约列表
  const contracts = [
    { name: "DTTERC20", address: address["GLSGD"].address, label: "GLSGD" },
    { name: "DTTERC20", address: address["GLUSD"].address, label: "GLUSD" },
    { name: "Encash", address: address["Encash"].address, label: "Encash" },
    {
      name: "RORERC721",
      address: address["RORERC721"].address,
      label: "RORERC721",
    },
    {
      name: "TransactionIDFactory",
      address: address["TransactionIDFactory"].address,
      label: "TransactionIDFactory",
    },
    {
      name: "RorEnhancement",
      address: address["RorEnhancement"].address,
      label: "RorEnhancement",
    },
    {
      name: "RorMarket",
      address: address["RorMarket"].address,
      label: "RorMarket",
    },
    {
      name: "Config",
      address: address["Config"].address,
      label: "Config",
    },
    {
      name: "DigitalTokenTradeDiamond",
      address: address["DigitalTokenTradeDiamond"].address,
      label: "DigitalTokenTradeDiamond",
    },
  ];

  // 验证普通合约所有权
  console.log("验证所有合约所有权");
  for (const contract of contracts) {
    try {
      const ContractInstance = await ethers.getContractAt(
        contract.name,
        contract.address,
      );

      const currentOwner = await ContractInstance.owner();
      const isCorrectOwner =
        currentOwner.toLowerCase() === expectedOwner.toLowerCase();

      console.log(`${contract.label}:`);
      console.log(`  地址: ${contract.address}`);
      console.log(`  当前所有者: ${currentOwner}`);
      console.log(`  验证结果: ${isCorrectOwner ? "✅ 通过" : "❌ 失败"}`);

      verificationResults.push({
        type: "ownership",
        name: contract.label,
        address: contract.address,
        expected: expectedOwner,
        actual: currentOwner,
        status: isCorrectOwner ? "pass" : "fail",
        error: "",
      });
    } catch (error) {
      console.log(`${contract.label}:`);
      console.log(`  地址: ${contract.address}`);
      console.log(`  验证结果: ❌ 错误 - ${error.message}`);

      verificationResults.push({
        type: "ownership",
        name: contract.label,
        address: contract.address,
        expected: expectedOwner,
        actual: "N/A",
        status: "error",
        error: error.message,
      });
    }
    console.log();
  }

  // 验证UserPermission角色
  console.log("验证UserPermission角色");
  try {
    const UserPermissionContract = await ethers.getContractAt(
      "UserPermission",
      address["UserPermission"].address,
    );

    console.log(`UserPermission合约地址: ${address["UserPermission"].address}`);

    // 获取角色常量
    const DEFAULT_ADMIN_ROLE =
      await UserPermissionContract.DEFAULT_ADMIN_ROLE();
    const OPERATOR = await UserPermissionContract.OPERATOR();

    // 验证DEFAULT_ADMIN_ROLE
    console.log("\n检查DEFAULT_ADMIN_ROLE:");
    const adminMemberCount =
      await UserPermissionContract.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
    console.log(`  成员数量: ${adminMemberCount}`);

    let adminRoleValid = false;
    let adminMembers = [];

    if (adminMemberCount.toString() === "0") {
      console.log("  验证结果: ❌ 失败 - 没有管理员成员");
    } else {
      for (let i = 0; i < adminMemberCount; i++) {
        const member = await UserPermissionContract.getRoleMember(
          DEFAULT_ADMIN_ROLE,
          i,
        );
        adminMembers.push(member);
        console.log(`  成员 ${i + 1}: ${member}`);
      }

      if (
        adminMemberCount.toString() === "1" &&
        adminMembers[0].toLowerCase() === expectedOwner.toLowerCase()
      ) {
        console.log("  验证结果: ✅ 通过 - 只有预期管理员拥有此角色");
        adminRoleValid = true;
      } else {
        console.log("  验证结果: ❌ 失败 - 成员数量不为1或成员不是预期管理员");
      }
    }

    verificationResults.push({
      type: "role",
      name: "DEFAULT_ADMIN_ROLE",
      address: address["UserPermission"].address,
      expected: expectedOwner,
      actual: adminMembers.join(", "),
      memberCount: adminMemberCount.toString(),
      status: adminRoleValid ? "pass" : "fail",
      error: "",
    });

    // 验证OPERATOR角色
    console.log("\n检查OPERATOR角色:");
    const operatorMemberCount =
      await UserPermissionContract.getRoleMemberCount(OPERATOR);
    console.log(`  成员数量: ${operatorMemberCount}`);

    let operatorRoleValid = false;
    let operatorMembers = [];

    if (operatorMemberCount.toString() === "0") {
      console.log("  验证结果: ✅ 通过 - 没有OPERATOR成员（可能未使用此角色）");
      operatorRoleValid = true;
    } else {
      for (let i = 0; i < operatorMemberCount; i++) {
        const member = await UserPermissionContract.getRoleMember(OPERATOR, i);
        operatorMembers.push(member);
        console.log(`  成员 ${i + 1}: ${member}`);
      }

      if (
        operatorMemberCount.toString() === "1" &&
        operatorMembers[0].toLowerCase() === expectedOwner.toLowerCase()
      ) {
        console.log("  验证结果: ✅ 通过 - 只有预期管理员拥有此角色");
        operatorRoleValid = true;
      } else if (operatorMemberCount.toString() === "0") {
        console.log("  验证结果: ✅ 通过 - 没有OPERATOR成员");
        operatorRoleValid = true;
      } else {
        console.log("  验证结果: ❌ 失败 - 成员数量不为1或成员不是预期管理员");
      }
    }

    verificationResults.push({
      type: "role",
      name: "OPERATOR",
      address: address["UserPermission"].address,
      expected: expectedOwner,
      actual: operatorMembers.join(", "),
      memberCount: operatorMemberCount.toString(),
      status: operatorRoleValid ? "pass" : "fail",
      error: "",
    });
  } catch (error) {
    console.log(`UserPermission角色验证错误: ${error.message}`);
    verificationResults.push({
      type: "role",
      name: "UserPermission",
      address: address["UserPermission"].address,
      expected: expectedOwner,
      actual: "N/A",
      memberCount: "N/A",
      status: "error",
      error: error.message,
    });
  }

  // 生成验证报告
  console.log("\n" + "=".repeat(60));
  console.log("摘要");
  console.log("=".repeat(60));
  console.log(`预期所有者/管理员: ${expectedOwner}`);
  console.log(`验证时间: ${new Date().toISOString()}`);

  const ownershipResults = verificationResults.filter(
    (r) => r.type === "ownership",
  );
  const roleResults = verificationResults.filter((r) => r.type === "role");

  const ownershipPassed = ownershipResults.filter(
    (r) => r.status === "pass",
  ).length;
  const ownershipFailed = ownershipResults.filter(
    (r) => r.status === "fail",
  ).length;
  const ownershipErrors = ownershipResults.filter(
    (r) => r.status === "error",
  ).length;

  const rolePassed = roleResults.filter((r) => r.status === "pass").length;
  const roleFailed = roleResults.filter((r) => r.status === "fail").length;
  const roleErrors = roleResults.filter((r) => r.status === "error").length;

  console.log(`\n合约所有权验证:`);
  console.log(`  ✅ 通过: ${ownershipPassed}`);
  console.log(`  ❌ 失败: ${ownershipFailed}`);
  console.log(`  🔥 错误: ${ownershipErrors}`);
  console.log(`  📊 总计: ${ownershipResults.length}`);

  console.log(`\n角色验证:`);
  console.log(`  ✅ 通过: ${rolePassed}`);
  console.log(`  ❌ 失败: ${roleFailed}`);
  console.log(`  🔥 错误: ${roleErrors}`);
  console.log(`  📊 总计: ${roleResults.length}`);

  console.log(`\n整体验证结果:`);
  const totalPassed = ownershipPassed + rolePassed;
  const totalFailed = ownershipFailed + roleFailed;
  const totalErrors = ownershipErrors + roleErrors;
  const totalItems = verificationResults.length;

  console.log(`  ✅ 通过: ${totalPassed}/${totalItems}`);
  console.log(`  ❌ 失败: ${totalFailed}/${totalItems}`);
  console.log(`  🔥 错误: ${totalErrors}/${totalItems}`);

  if (totalFailed === 0 && totalErrors === 0) {
    console.log(`\n🎉 所有验证项目均通过！`);
  } else {
    console.log(`\n⚠️  存在验证失败或错误项目，请检查详细信息`);
  }

  // 详细失败/错误信息
  if (totalFailed > 0 || totalErrors > 0) {
    console.log("\n" + "-".repeat(60));
    console.log("详细失败/错误信息");
    console.log("-".repeat(60));

    verificationResults.forEach((result) => {
      if (result.status === "fail" || result.status === "error") {
        console.log(
          `\n${result.type === "ownership" ? "合约" : "角色"}: ${result.name}`,
        );
        console.log(`  地址: ${result.address}`);
        console.log(`  预期: ${result.expected}`);
        console.log(`  实际: ${result.actual}`);
        if (result.memberCount) {
          console.log(`  成员数: ${result.memberCount}`);
        }
        if (result.error) {
          console.log(`  错误: ${result.error}`);
        }
      }
    });
  }

  return verificationResults;
}

async function main() {
  const expectedOwner = ""; // 在此设置预期的所有者地址

  if (expectedOwner === "") {
    console.error("请设置预期所有者地址");
    process.exit(1);
  }

  try {
    await verifyOwnershipAndRoles(expectedOwner);
  } catch (error) {
    console.error("验证过程失败:", error);
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

module.exports = { verifyOwnershipAndRoles };
