const {
  Finding,
  FindingSeverity,
  FindingType,
  getEthersProvider,
} = require("forta-agent");
const BigNumber = require("bignumber.js");
const { acountA } = require("./address");

const MIN_BALANCE = "500000000000000000"; // 0.5 eth
const minBalance = new BigNumber(MIN_BALANCE).dividedBy(10 ** 18);

const ethersProvider = getEthersProvider();

function provideHandleBlock(ethersProvider) {
  return async function handleBlock(blockEvent) {
    // report finding if specified account balance falls below threshold
    const findings = [];

    for (const account of acountA) {
      const accountBalance = new BigNumber(
        (await ethersProvider.getBalance(account)).toString(),
      );

      if (accountBalance.isGreaterThanOrEqualTo(MIN_BALANCE)) return findings;

      findings.push(
        Finding.fromObject({
          name: "余额不足",
          description: `充值账户余额 ${accountBalance.dividedBy(10 ** 18).toString()}e 低于阈值 ${minBalance.toString()}e`,
          alertId: "LOW_BALANCE",
          severity: FindingSeverity.High,
          type: FindingType.Info,
          metadata: {
              account: account,
              balance: accountBalance.toString(),
          },
        }),
      );
    }

    return findings;
  };
}

module.exports = {
  provideHandleBlock,
  handleBlock: provideHandleBlock(ethersProvider),
};
