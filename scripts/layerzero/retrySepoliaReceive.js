const hre = require("hardhat");
const {
  DEFAULTS,
  getEnv,
  getScanMessage,
  readLocalDeployment,
  toBytes32,
} = require("./utils");

async function main() {
  const txHash = process.env.TX_HASH;
  const guid = process.env.GUID;
  const deployment = readLocalDeployment(hre.network.name) || {};
  const receiver = getEnv("RECEIVER_ADDRESS", deployment.proxy);
  const endpointAddress = getEnv("ENDPOINT_V2", deployment.endpointV2 || DEFAULTS.endpointV2);
  const message = await getScanMessage({ txHash, guid });

  if (Number(message.pathway?.dstEid) !== Number(process.env.LOCAL_EID || DEFAULTS.localEid)) {
    throw new Error(`Message destination eid ${message.pathway?.dstEid} does not match local EVM eid`);
  }

  if (message.destination?.status === "SUCCEEDED") {
    console.log(`Message already executed on destination: ${message.destination?.tx?.txHash || message.guid}`);
    return;
  }

  const origin = {
    srcEid: Number(message.pathway.srcEid),
    sender: toBytes32(message.pathway.sender.address),
    nonce: BigInt(message.pathway.nonce),
  };
  const payload = message.source?.tx?.payload;
  if (!payload) {
    throw new Error("Missing source payload from LayerZero Scan");
  }

  const endpoint = await hre.ethers.getContractAt(
    [
      "function lzReceive((uint32 srcEid, bytes32 sender, uint64 nonce) _origin, address _receiver, bytes32 _guid, bytes _message, bytes _extraData) payable",
    ],
    endpointAddress
  );

  const tx = await endpoint.lzReceive(origin, receiver, message.guid, payload, "0x");
  const receipt = await tx.wait();

  console.log(`retryTx=${receipt.hash}`);
  console.log(`guid=${message.guid}`);
  console.log(`receiver=${receiver}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
