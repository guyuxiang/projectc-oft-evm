const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { allCA } = require("./address");
const OWNERSHIP_TRANSFERRED_EVENT =
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)";

const handleTransaction = async (txEvent) => {
  const findings = [];

  const events = txEvent.filterLog(OWNERSHIP_TRANSFERRED_EVENT, allCA);

  events.forEach((event) => {
    const { previousOwner, newOwner } = event.args;
    findings.push(
      Finding.fromObject({
        name: "所有者变更",
        description: `合约 ${event.address} 的所有者变更为 ${newOwner}`,
        alertId: "OWNERSHIP_CHANGES",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
          previousOwner: previousOwner,
          newOwner: newOwner,
        },
      }),
    );
  });

  return findings;
};

module.exports = {
  handleTransaction,
};
