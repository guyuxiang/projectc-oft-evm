require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-forta");
require("dotenv").config();
require("hardhat-storage-layout-changes");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");

function normalizePrivateKey(value) {
  if (!value) return value;
  return value.startsWith("0x") ? value : `0x${value}`;
}

// tdly.setup();
task(
  "hello",
  "Prints 'Hello, World!'",
  async function (taskArguments, hre, runSuper) {
    console.log("Hello, World!");
  },
);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
      },
      viaIR: true,
    },
  },
  forta: {
    contextPath: "forta-agents", // default: "agents"
  },
  networks: {
    linea_sepolia: {
      url: "https://linea-sepolia.gateway.tenderly.co/1GjaTkoayBTlQHJ9OGWU8N",
      chainId: 59141,
      accounts: [
        normalizePrivateKey("30e0e9db4f5333aa98ecdaa43644a1566f441c9d754636dc1049c3511c59a929"),
      ],
    },
    sepolia: {
      url: "https://sepolia.gateway.tenderly.co/65VPkX3BEXAlx0MQDjKgF7",
      chainId: 11155111,
      eid: 40161,
      accounts: [
        normalizePrivateKey("8e948e8f61e7468921b55e2581b6964174bb54f73492768f08d9c3e84f84518d"),
      ],
    },
  },
  sourcify: { enabled: true },
  etherscan: {
    apiKey: "",
    customChains: [
      {
        network: "lineaSepolia",
        chainId: 59141,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=59141",
          browserURL: "https://sepolia.lineascan.build",
        },
      }
    ],
  }
};
