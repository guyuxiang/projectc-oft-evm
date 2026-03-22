const {
  Finding,
  FindingSeverity,
  FindingType,
  getEthersProvider
} = require("forta-agent");
const { ethers } = require("ethers");

// 配置阈值 (单位: Gwei)
const GAS_PRICE_THRESHOLD = 150; // 可根据需要调整
const ethersProvider = getEthersProvider();

function provideHandleBlock(ethersProvider) {
  return async function handleBlock(blockEvent) {
    const findings = [];
    const gasPrice = await ethersProvider.getGasPrice();
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, "gwei"));

    if (gasPriceGwei >= GAS_PRICE_THRESHOLD) {
      findings.push(Finding.fromObject({
          name: "高费用",
          description: `Gas Price 飙升到 ${gasPriceGwei} Gwei`,
          alertId: "HIGH_GASPRICE",
          severity: FindingSeverity.Medium,
          type: FindingType.Info,
          metadata: {
            gasPrice: gasPriceGwei,
            threshold: GAS_PRICE_THRESHOLD.toString(),
          },
        })
      );
    }
    return findings;
  }
}

module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(ethersProvider),
};
