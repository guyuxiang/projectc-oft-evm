const {
  Finding,
  FindingSeverity,
  FindingType,
  getTransactionReceipt,
} = require("forta-agent");
const { allCA } = require("./address");

const handleTransaction = async (txEvent) => {
  const findings = [];
  if (allCA.includes(txEvent.to)) {
    const { status } = await getTransactionReceipt(txEvent.hash);
    if (!status) {
      findings.push(
        Finding.fromObject({
          name: "交易失败",
          description: `调用合约 ${txEvent.to} 的交易 ${txEvent.hash} 失败`,
          alertId: "TRANSACTION_FAILED",
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: {
            hash: txEvent.hash,
            from: txEvent.from,
            to: txEvent.to,
          },
        }),
      );
    }
  }

  return findings;
};

module.exports = {
  handleTransaction,
};
