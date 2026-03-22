require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomicfoundation/hardhat-ethers");
require("hardhat-forta");
require("dotenv").config();
require("hardhat-storage-layout-changes");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");

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
        "30e0e9db4f5333aa98ecdaa43644a1566f441c9d754636dc1049c3511c59a929",
      ],
    },
    unichain_sepolia: {
      url: "https://cold-methodical-surf.unichain-sepolia.quiknode.pro/42ae3ab40beb6d16e4c2810d922476fcf38144fd/",
      chainId: 1301,
      accounts: [
        "298149d01f7a23cb938ab6874ea345516479fb70bd5e14c99c0ffaf84798ca80",
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
