const { ethers } = require("hardhat");
const db = require("../flowCli/db.js");
const hre = require("hardhat");

async function getContractInstance(contractName, contractAddress) {
  const Contract = await ethers.getContractAt(contractName, contractAddress);
  return Contract;
}

async function main() {
  const address = await db.read();
  console.log("all address", address);

  const envParam = await db.readConfig();
  console.log("envParam", envParam);

  // ----------------------setIssuer--------------------------------------
  const Accessor = await getContractInstance(
    "UserPermission",
    address["UserPermission"].address,
  );

  const ISSUER_ROLE = hre.ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE"));
  tx = await Accessor.grantRoles(ISSUER_ROLE, envParam.issuer);
  // const res =  await Accessor.hasRole("0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122", envParam.issuer)
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`grantRoles failed: ${tx.hash}`);
  }
  console.log("grantRoles成功");

  const GLSGDContract = await getContractInstance(
    "DTTERC20",
    address["GLSGD"].address,
  );
  tx = await GLSGDContract.setIssuer(envParam.issuer);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的Issuer设置 failed: ${tx.hash}`);
  }
  console.log(`GLSGD的Issuer设置成功`);

  const GLUSDContract = await getContractInstance(
    "DTTERC20",
    address["GLUSD"].address,
  );
  tx = await GLUSDContract.setIssuer(envParam.issuer);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的Issuer failed: ${tx.hash}`);
  }
  console.log(`GLSGD的Issuer设置成功`);

  const RORTokenC = await getContractInstance(
    "RORERC721",
    address["RORERC721"].address,
  );
  tx = await RORTokenC.setIssuer(envParam.issuer);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`RORToken的Issuer设置 failed: ${tx.hash}`);
  }
  console.log("RORToken的Issuer设置成功");

  // ----------------------setMintLimit------------------------
  tx = await GLSGDContract.setMintLimit("5000000000000000000000000");
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的MintLimit设置 failed: ${tx.hash}`);
  }
  console.log(`GLSGD的MintLimit设置成功`);

  tx = await GLUSDContract.setMintLimit("5000000000000000000000000");
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的MintLimit failed: ${tx.hash}`);
  }
  console.log(`GLSGD的MintLimit设置成功`);

  // ----------------------setTokenMintLicensor------------------------
  tx = await GLSGDContract.setTokenMintLicensor(envParam.tokenMintLicensor);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的TokenMintLicensor设置 failed: ${tx.hash}`);
  }
  console.log(`GLSGD的TokenMintLicensor设置成功`);

  tx = await GLUSDContract.setTokenMintLicensor(envParam.tokenMintLicensor);
  receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`GLSGD的TokenMintLicensor failed: ${tx.hash}`);
  }
  console.log(`GLSGD的TokenMintLicensor设置成功`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
