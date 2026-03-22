const { Finding, FindingSeverity, FindingType } = require("forta-agent");
const { accessCA } = require("./address");

const ROLE_GRANTED_EVENT =
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)";

const handleTransaction = async (txEvent) => {
  const findings = [];

  // filter the transaction logs for Tether transfer events
  const events = txEvent.filterLog(ROLE_GRANTED_EVENT, accessCA);

  events.forEach((event) => {
    const { role, account, sender } = event.args;
    findings.push(
      Finding.fromObject({
        name: "权限更改",
        description: `权限角色 ${role} 授权给了 ${account}`,
        alertId: "ACCESS_CONTROL_CHANGES",
        severity: FindingSeverity.High,
        type: FindingType.Info,
        metadata: {
            role: role,
            account: account,
            sender: sender,
        },
      }),
    );
  });

  return findings;
};

module.exports = {
  handleTransaction,
};
