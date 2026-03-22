const BigNumber = require("bignumber.js");
const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { tokenCA } = require("./address");
const TOKEN_DECIMALS = 18;
const ERC20_TRANSFER_EVENT =
  "event Transfer(address indexed from, address indexed to, uint value)";

const AMOUNT_THRESHOLD = "500000"; // 0.5 million

function provideHandleTransaction(amountThreshold) {
  return async function handleTransaction(txEvent) {
    const findings = [];

    // filter the transaction logs for USDT Transfer events
    const tokenTransferEvents = txEvent.filterLog(
      ERC20_TRANSFER_EVENT,
      tokenCA,
    );

    // fire alerts for transfers of large amounts
    tokenTransferEvents.forEach((tokenTransfer) => {
      const amount = new BigNumber(
        tokenTransfer.args.value.toString(),
      ).dividedBy(10 ** TOKEN_DECIMALS);

      if (amount.isLessThan(amountThreshold)) return;

      const formattedAmount = amount.toFixed(2);
      findings.push(
        Finding.fromObject({
          name: "大额转账",
          description: `${formattedAmount} 个稳定币被转账给 ${tokenTransfer.args.to}`,
          alertId: "LARGE_TRANSFER",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: {
            from: tokenTransfer.args.from,
            to: tokenTransfer.args.to,
            amount: tokenTransfer.args.value.toString(),
          },
        }),
      );
    });

    return findings;
  };
}

module.exports = {
  provideHandleTransaction,
  handleTransaction: provideHandleTransaction(AMOUNT_THRESHOLD),
};
