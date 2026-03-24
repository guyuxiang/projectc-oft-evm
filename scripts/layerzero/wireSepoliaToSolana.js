const hre = require("hardhat");
const { Options } = require("@layerzerolabs/lz-v2-utilities");
const {
  DEFAULTS,
  getEnv,
  readLocalDeployment,
  readSiblingSolanaDeployment,
  writeLocalDeployment,
  toSolanaBytes32,
} = require("./utils");

async function main() {
  const networkName = hre.network.name;
  const deployment = readLocalDeployment(networkName);
  if (!deployment?.proxy) {
    throw new Error(`Missing deployment file: deployments/${networkName}/OFT.json`);
  }

  const siblingSolana = readSiblingSolanaDeployment() || {};
  const remoteEid = Number(process.env.SOLANA_DST_EID || DEFAULTS.remoteEid);
  const remotePeer = getEnv("SOLANA_OFT_STORE", siblingSolana.oftStore);
  const delegate = process.env.DELEGATE_ADDRESS;

  const receiveGas = BigInt(process.env.SOLANA_RECEIVE_GAS || DEFAULTS.evmToSolanaGas);
  const receiveValue = BigInt(process.env.SOLANA_RECEIVE_VALUE || DEFAULTS.evmToSolanaValue);
  const enforcedOptions =
    process.env.ENFORCED_OPTIONS_HEX ||
    new Options().addExecutorLzReceiveOption(receiveGas, receiveValue).toHex();

  const [signer] = await hre.ethers.getSigners();
  const oft = await hre.ethers.getContractAt("DTTERC20", deployment.proxy, signer);

  if (delegate) {
    const delegateTx = await oft.setDelegate(delegate);
    await delegateTx.wait();
    console.log(`setDelegateTx=${delegateTx.hash}`);
  }

  const peerBytes32 = toSolanaBytes32(remotePeer);
  const currentPeer = await oft.peers(remoteEid);
  if (currentPeer.toLowerCase() !== peerBytes32.toLowerCase()) {
    const peerTx = await oft.setPeer(remoteEid, peerBytes32);
    await peerTx.wait();
    console.log(`setPeerTx=${peerTx.hash}`);
  } else {
    console.log(`peer already set: ${remotePeer}`);
  }

  const currentOptions = await oft.enforcedOptions(remoteEid, DEFAULTS.msgTypeSend);
  if (currentOptions.toLowerCase() !== enforcedOptions.toLowerCase()) {
    const optionsTx = await oft.setEnforcedOptions([
      {
        eid: remoteEid,
        msgType: DEFAULTS.msgTypeSend,
        options: enforcedOptions,
      },
    ]);
    await optionsTx.wait();
    console.log(`setEnforcedOptionsTx=${optionsTx.hash}`);
  } else {
    console.log(`enforced options already set: ${enforcedOptions}`);
  }

  writeLocalDeployment(networkName, {
    ...deployment,
    remote: {
      eid: remoteEid,
      peer: remotePeer,
      enforcedOptions,
    },
    delegate: delegate || deployment.delegate || null,
  });

  console.log(`proxy=${deployment.proxy}`);
  console.log(`remotePeer=${remotePeer}`);
  console.log(`enforcedOptions=${enforcedOptions}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
