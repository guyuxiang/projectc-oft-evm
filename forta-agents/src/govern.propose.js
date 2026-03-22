const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { governCA } = require("./address");
const PROPOSE_EVENT =
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)";

async function handleTransaction(txEvent) {
  const findings = [];

  const events = txEvent.filterLog(PROPOSE_EVENT, governCA);
  events.forEach((event) => {
    const { proposalId, proposer, targets, values, signatures, calldatas } =
      event.args;
    findings.push(
      Finding.fromObject({
        name: "Propose",
        description: `call ${event.address} propose: ${proposalId}`,
        alertId: "DTT",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
          targets: targets,
          values: values,
          calldatas: calldatas,
        },
      }),
    );
  });

  return findings;
}

module.exports = {
  handleTransaction,
};
