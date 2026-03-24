const hre = require("hardhat");
const { ethers } = hre;
const {
  getEnv,
  readLocalDeployment,
} = require("./utils");

async function main() {
  const deployment = readLocalDeployment(hre.network.name) || {};
  const oftAddress = getEnv("EVM_OFT_ADDRESS", deployment.proxy);
  const recipient = getEnv("RECIPIENT");
  const amountInput = getEnv("AMOUNT");
  const refundId = getEnv("REFUND_ID");

  const [issuer] = await hre.ethers.getSigners();
  const oft = await hre.ethers.getContractAt("DTTERC20", oftAddress, issuer);
  const decimals = Number(await oft.decimals());
  const amount = ethers.parseUnits(amountInput, decimals);

  const licensorKey = process.env.LICENSOR_PRIVATE_KEY;
  const licensor = licensorKey
    ? new ethers.Wallet(licensorKey, issuer.provider)
    : issuer;

  const domain = {
    name: await oft.name(),
    version: "1",
    chainId: Number((await issuer.provider.getNetwork()).chainId),
    verifyingContract: await oft.getAddress(),
  };
  const types = {
    MintPermit: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "bid", type: "string" },
    ],
  };
  const signature = await licensor.signTypedData(domain, types, {
    to: recipient,
    amount,
    bid: refundId,
  });

  const tx = await oft.mint(recipient, amount, refundId, signature);
  const receipt = await tx.wait();
  const balance = await oft.balanceOf(recipient);

  console.log(`refundTx=${receipt.hash}`);
  console.log(`recipient=${recipient}`);
  console.log(`balance=${balance.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
