const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { allCA } = require("./address");
const SETCONFIG_EVENT = "event setConfigEvent(address configContract)";

async function handleTransaction(txEvent) {
  const findings = [];

  const events = txEvent.filterLog(SETCONFIG_EVENT, allCA);

  events.forEach((event) => {
    const { configContract } = event.args;
    findings.push(
      Finding.fromObject({
        name: "配置变更",
        description: `合约 ${event.address} 的配置合约变更为 ${configContract}`,
        alertId: "CONFIG_SET",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
          newConfig: configContract,
        },
      }),
    );
  });

  return findings;
}

module.exports = {
  handleTransaction,
};
