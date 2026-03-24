const fs = require("node:fs");
const path = require("node:path");
const bs58 = require("bs58");

const DEFAULTS = {
  network: "sepolia",
  localEid: 40161,
  remoteEid: 40168,
  endpointV2: "0x6EDCE65403992e310A62460808c4b910D972f10f",
  scanApiBase: "https://scan-testnet.layerzero-api.com/v1",
  tokenName: "GLUSD",
  tokenSymbol: "GLUSD",
  solanaRpcUrl:
    "https://solana-devnet.g.alchemy.com/v2/ctfqrNoJ-i8cb99lEfS-Xpt57IDzQmwQ",
  evmToSolanaGas: 200000n,
  evmToSolanaValue: 2039280n,
  solanaToEvmGas: 80000n,
  solanaToEvmValue: 0n,
  msgTypeSend: 1,
};

function getEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function getDeploymentPath(networkName = DEFAULTS.network) {
  return path.join(process.cwd(), "deployments", networkName, "OFT.json");
}

function readLocalDeployment(networkName = DEFAULTS.network) {
  return readJson(getDeploymentPath(networkName));
}

function writeLocalDeployment(networkName, data) {
  writeJson(getDeploymentPath(networkName), data);
}

function readSiblingSolanaDeployment() {
  return readJson(
    path.join(
      process.cwd(),
      "..",
      "projectc-oft-solana",
      "deployments",
      "solana-testnet",
      "OFT.json"
    )
  );
}

function toSolanaBytes32(address) {
  const decoded = bs58.decode(address);
  if (decoded.length > 32) {
    throw new Error(`Invalid Solana address length: ${decoded.length}`);
  }
  return `0x${Buffer.concat([Buffer.alloc(32 - decoded.length), Buffer.from(decoded)]).toString("hex")}`;
}

function toBytes32(address) {
  if (address.startsWith("0x")) {
    const normalized = address.toLowerCase().replace(/^0x/, "");
    if (normalized.length > 64) {
      throw new Error(`Invalid bytes32 input: ${address}`);
    }
    return `0x${normalized.padStart(64, "0")}`;
  }
  return toSolanaBytes32(address);
}

function isZeroHex(value) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized === "0x" || /^0x0+$/.test(normalized);
}

async function solanaRpc(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const body = await response.json();
  if (body.error) {
    throw new Error(`Solana RPC ${method} failed: ${JSON.stringify(body.error)}`);
  }
  return body.result;
}

async function scanApi(pathname) {
  const baseUrl = process.env.LZ_SCAN_API_BASE || DEFAULTS.scanApiBase;
  const response = await fetch(`${baseUrl}${pathname}`);
  if (!response.ok) {
    throw new Error(`LayerZero Scan API failed: ${response.status} ${response.statusText}`);
  }
  const body = await response.json();
  return body;
}

async function getScanMessage({ txHash, guid }) {
  if (!txHash && !guid) {
    throw new Error("Missing TX_HASH or GUID");
  }
  const pathname = txHash ? `/messages/tx/${txHash}` : `/messages/guid/${guid}`;
  const body = await scanApi(pathname);
  const message = body?.data?.[0];
  if (!message) {
    throw new Error(`LayerZero Scan message not found for ${txHash || guid}`);
  }
  return message;
}

async function getSolanaMintDecimals(rpcUrl, mint) {
  const result = await solanaRpc(rpcUrl, "getTokenSupply", [mint, { commitment: "confirmed" }]);
  return Number(result?.value?.decimals ?? 0);
}

async function getSolanaOwnerMintBalance(rpcUrl, owner, mint) {
  const result = await solanaRpc(rpcUrl, "getTokenAccountsByOwner", [
    owner,
    { mint },
    { encoding: "jsonParsed", commitment: "confirmed" },
  ]);

  return result.value.reduce((sum, entry) => {
    const amount = entry.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0";
    return sum + BigInt(amount);
  }, 0n);
}

async function waitForSolanaBalanceIncrease({
  rpcUrl,
  owner,
  mint,
  before,
  minDelta,
  timeoutMs,
  pollIntervalMs,
}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const current = await getSolanaOwnerMintBalance(rpcUrl, owner, mint);
    if (current >= before + minDelta) {
      return current;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(
    `Timed out waiting for Solana balance increase. before=${before} minDelta=${minDelta}`
  );
}

module.exports = {
  DEFAULTS,
  getEnv,
  getDeploymentPath,
  readLocalDeployment,
  writeLocalDeployment,
  readSiblingSolanaDeployment,
  toSolanaBytes32,
  toBytes32,
  isZeroHex,
  scanApi,
  getScanMessage,
  solanaRpc,
  getSolanaMintDecimals,
  getSolanaOwnerMintBalance,
  waitForSolanaBalanceIncrease,
};
