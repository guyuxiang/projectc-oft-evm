const BigNumber = require("bignumber.js");
const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { tokenCA } = require("./address");
const TOKEN_DECIMALS = 18;
const ERC20_MINT_EVENT =
  "event Mint(string txID, address recipient, uint256 amount)";

const AMOUNT_THRESHOLD = "1000000"; // 1 million

function provideHandleTransaction(amountThreshold) {
  return async function handleTransaction(txEvent) {
    const findings = [];

    // filter the transaction logs for USDT Transfer events
    const events = txEvent.filterLog(ERC20_MINT_EVENT, tokenCA);

    // fire alerts for transfers of large amounts
    events.forEach((event) => {
      const { txID, recipient, amount } = event.args;
      // shift decimal places of transfer amount
      const mintAmount = new BigNumber(amount.toString()).dividedBy(
        10 ** TOKEN_DECIMALS,
      );

      if (mintAmount.isLessThan(amountThreshold)) return;

      const formattedAmount = mintAmount.toFixed(2);
      findings.push(
        Finding.fromObject({
          name: "大额铸造",
          description: `${formattedAmount} 个稳定币被铸造给 ${recipient}`,
          alertId: "LARGE_MINT",
          severity: FindingSeverity.Info,
          type: FindingType.Info,
          metadata: {
            businessID: txID,
            to: recipient,
            amount: amount.toString(),
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
