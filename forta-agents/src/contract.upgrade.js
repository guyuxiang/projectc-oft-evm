const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { proxyCA } = require("./address");

const ERC1967_UPGRADE_EVENT = "event Upgraded(address indexed implementation)";

const handleTransaction = async (txEvent) => {
  const findings = [];

  const events = txEvent.filterLog(ERC1967_UPGRADE_EVENT, proxyCA);

  events.forEach((event) => {
    findings.push(
      Finding.fromObject({
        name: "合约升级",
        description: `代理合约 ${event.address} 的实现已更新为 ${event.args.implementation}`,
        alertId: "CONTRACT_UPGRADE",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
          proxyContract: event.address,
          newImplementation: event.args.implementation,
          upgrader: event.args.from
        },
      }),
    );
  });

  return findings;
};

module.exports = {
  handleTransaction,
};
