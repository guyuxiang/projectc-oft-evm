const BigNumber = require("bignumber.js");
const {
  Finding,
  FindingSeverity,
  FindingType,
  getTransactionReceipt,
} = require("forta-agent");
const { allCA } = require("./address");

const MEDIUM_GAS_THRESHOLD = "800000";
const HIGH_GAS_THRESHOLD = "2000000";
const CRITICAL_GAS_THRESHOLD = "5000000";

// report finding if gas used in transaction is higher than threshold
const handleTransaction = async (txEvent) => {
  const findings = [];
  if (allCA.includes(txEvent.to)) {
    const { gasUsed } = await getTransactionReceipt(txEvent.hash);
    const gasUseds = new BigNumber(gasUsed);

    if (gasUseds.isLessThan(MEDIUM_GAS_THRESHOLD)) return findings;

    findings.push(
      Finding.fromObject({
        name: "High Gas Used",
        description: `Gas Used: ${gasUseds}`,
        alertId: "DTT",
        type: FindingType.Suspicious,
        severity: getSeverity(gasUseds),
        metadata: {
          gasUsed: gasUseds.toString(),
        },
      }),
    );
  }
  return findings;
};

const getSeverity = (gasUsed) => {
  return gasUsed.isGreaterThan(CRITICAL_GAS_THRESHOLD)
    ? FindingSeverity.Critical
    : gasUsed.isGreaterThan(HIGH_GAS_THRESHOLD)
      ? FindingSeverity.High
      : FindingSeverity.Medium;
};

module.exports = {
  handleTransaction,
};
