const hre = require("hardhat");
const {
  DEFAULTS,
  getEnv,
  isZeroHex,
  readLocalDeployment,
  readSiblingSolanaDeployment,
  toSolanaBytes32,
  getSolanaMintDecimals,
  getSolanaOwnerMintBalance,
  waitForSolanaBalanceIncrease,
} = require("./utils");

async function main() {
  const deployment = readLocalDeployment(hre.network.name) || {};
  const siblingSolana = readSiblingSolanaDeployment() || {};
  const oftAddress = getEnv("EVM_OFT_ADDRESS", deployment.proxy);
  const solanaRecipient = getEnv("SOLANA_RECIPIENT");
  const solanaMint = getEnv("SOLANA_MINT", siblingSolana.mint);
  const amount = getEnv("AMOUNT");
  const dstEid = Number(process.env.SOLANA_DST_EID || DEFAULTS.remoteEid);
  const solanaRpcUrl = getEnv("SOLANA_RPC_URL", DEFAULTS.solanaRpcUrl);
  const minAmountInput = process.env.MIN_AMOUNT || amount;
  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);
  const timeoutMs = Number(process.env.TIMEOUT_MS || 10 * 60 * 1000);

  const [signer] = await hre.ethers.getSigners();
  const oft = await hre.ethers.getContractAt("DTTERC20", oftAddress, signer);

  const decimals = await oft.decimals();
  const amountLD = hre.ethers.parseUnits(amount, decimals);
  const minAmountLD = hre.ethers.parseUnits(minAmountInput, decimals);
  const solanaDecimals = await getSolanaMintDecimals(solanaRpcUrl, solanaMint);
  const minAmountOnSolana = hre.ethers.parseUnits(minAmountInput, solanaDecimals);

  let extraOptions =
    process.env.EXTRA_OPTIONS_HEX || deployment.remote?.enforcedOptions || "0x";
  if (isZeroHex(extraOptions)) {
    try {
      extraOptions = await oft.enforcedOptions(dstEid, DEFAULTS.msgTypeSend);
    } catch (error) {
      throw new Error(
        `Missing EXTRA_OPTIONS_HEX and failed to read enforced options: ${error.message}`
      );
    }
  }

  if (isZeroHex(extraOptions)) {
    throw new Error(
      "No message execution options configured. Set EXTRA_OPTIONS_HEX or set enforced options on-chain first."
    );
  }

  const srcBalanceBefore = await oft.balanceOf(signer.address);
  const dstBalanceBefore = await getSolanaOwnerMintBalance(
    solanaRpcUrl,
    solanaRecipient,
    solanaMint
  );

  const sendParam = {
    dstEid,
    to: toSolanaBytes32(solanaRecipient),
    amountLD,
    minAmountLD,
    extraOptions,
    composeMsg: "0x",
    oftCmd: "0x",
  };

  const quotedFee = await oft.quoteSend(sendParam, false);
  const fee = {
    nativeFee: quotedFee.nativeFee,
    lzTokenFee: quotedFee.lzTokenFee,
  };

  console.log("Source EVM balance before:", srcBalanceBefore.toString());
  console.log("Destination Solana balance before:", dstBalanceBefore.toString());
  console.log("Quoted native fee:", fee.nativeFee.toString());

  const tx = await oft.send(sendParam, fee, signer.address, {
    value: fee.nativeFee,
  });
  const receipt = await tx.wait();

  console.log("Source tx hash:", receipt.hash);
  console.log(`LayerZero Scan: https://testnet.layerzeroscan.com/tx/${receipt.hash}`);

  const dstBalanceAfter = await waitForSolanaBalanceIncrease({
    rpcUrl: solanaRpcUrl,
    owner: solanaRecipient,
    mint: solanaMint,
    before: dstBalanceBefore,
    minDelta: minAmountOnSolana,
    timeoutMs,
    pollIntervalMs,
  });
  const srcBalanceAfter = await oft.balanceOf(signer.address);

  console.log("Source EVM balance after:", srcBalanceAfter.toString());
  console.log("Destination Solana balance after:", dstBalanceAfter.toString());
  console.log("Validated destination balance increase:", (dstBalanceAfter - dstBalanceBefore).toString());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
