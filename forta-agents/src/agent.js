const accessControlChangesAgent = require("./access.control.changes");
const contractUpgradeAgent = require("./contract.upgrade");
const highGasPriceAgent = require("./high.gas.price");
const highMintAmountAgent = require("./high.mint.amount");
const highTransferAmountAgent = require("./high.transfer.amount");
const lowETHBalanceAgent = require("./low.eth.balance");
const ownershipChangesAgent = require("./ownership.changes");
const setConfigAgent = require("./set.config");
const txFailedAgent = require("./tx.failed");
const { getJsonRpcUrl } = require("forta-agent");
console.log(getJsonRpcUrl());

// let findingsCount = 0;
function providehandleBlock(lowETHBalanceAgent, highGasPriceAgent) {
  return async function handleBlock(blockEvent) {
    // limiting this agent to emit only 5 findings so that the alert feed is not spammed
    // if (findingsCount >= 5) return [];

    const findings = (
      await Promise.all([
        lowETHBalanceAgent.handleBlock(blockEvent),
        highGasPriceAgent.handleBlock(blockEvent)
      ])
    ).flat();

    // findingsCount += findings.length;
    return findings;
  };
}

function provideHandleTransaction(
  accessControlChangesAgent,
  contractUpgradeAgent,
  highMintAmountAgent,
  highTransferAmountAgent,
  ownershipChangesAgent,
  setConfigAgent,
  txFailedAgent,
) {
  return async function handleTransaction(txEvent) {
    // limiting this agent to emit only 5 findings so that the alert feed is not spammed
    // if (findingsCount >= 5) return [];

    const findings = (
      await Promise.all([
        accessControlChangesAgent.handleTransaction(txEvent),
        contractUpgradeAgent.handleTransaction(txEvent),
        highMintAmountAgent.handleTransaction(txEvent),
        highTransferAmountAgent.handleTransaction(txEvent),
        ownershipChangesAgent.handleTransaction(txEvent),
        setConfigAgent.handleTransaction(txEvent),
        txFailedAgent.handleTransaction(txEvent),
      ])
    ).flat();

    // findingsCount += findings.length;
    return findings;
  };
}

module.exports = {
  providehandleBlock,
  provideHandleTransaction,
  handleBlock: providehandleBlock(
      lowETHBalanceAgent,
      highGasPriceAgent
  ),
  handleTransaction: provideHandleTransaction(
    accessControlChangesAgent,
    contractUpgradeAgent,
    highMintAmountAgent,
    highTransferAmountAgent,
    ownershipChangesAgent,
    setConfigAgent,
    txFailedAgent,
  ),
};

// const initialize = async () => {
//   // do some initialization on startup e.g. fetch data
// }

// const handleBlock = async (blockEvent) => {
//   const findings = [];
//   // detect some block condition
//   return findings;
// };

// const handleAlert = async (alertEvent) => {
//   const findings = [];
//   // detect some alert condition
//   return findings;
// };
