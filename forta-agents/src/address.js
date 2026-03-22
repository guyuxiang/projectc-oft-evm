const fs = require("fs");
const p = require("path");

function readFile(path) {
  try {
    const data = fs.readFileSync(path, { encoding: "utf8" });
    return JSON.parse(data.toString());
  } catch (err) {
    throw err;
  }
}

const address = readFile(
  p.join(__dirname, "./", "address.json"),
);
console.log("address:", address);

const paramConfig = readFile(
  p.join(__dirname, "./", "paramConfig.json"),
);
console.log("paramConfig:", paramConfig);

// 按合约分类进行不同的监控
module.exports = {
  acountA: [paramConfig.topUpAccount].map((item) =>
    item.toLowerCase(),
  ),
  accessCA: [address["UserPermission"].address].map((item) =>
    item.toLowerCase(),
  ),
  // governCA: [address["Governance"].address].map((item) => item.toLowerCase()),
  tokenCA: [address["GLSGD"].address, address["GLUSD"].address].map((item) =>
    item.toLowerCase(),
  ),
  proxyCA: [
    address["GLSGD"].address,
    address["GLUSD"].address,
    address["TransactionIDFactory"].address,
    address["DigitalTokenTradeDiamond"].address,
    address["Encash"].address,
    address["RORERC721"].address,
  ].map((item) => item.toLowerCase()),
  allCA: [
    address["GLSGD"].address,
    address["GLUSD"].address,
    address["TransactionIDFactory"].address,
    address["DigitalTokenTradeDiamond"].address,
    address["Encash"].address,
    address["RORERC721"].address,
    address["RorEnhancement"].address,
    address["RorMarket"].address,
    address["Config"].address,
  ].map((item) => item.toLowerCase()),
};
