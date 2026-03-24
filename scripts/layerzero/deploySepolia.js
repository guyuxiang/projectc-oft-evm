const hre = require("hardhat");
const {
  DEFAULTS,
  getEnv,
  readLocalDeployment,
  writeLocalDeployment,
} = require("./utils");

async function maybeSend(currentValue, expectedValue, label, action) {
  if (!expectedValue) {
    return null;
  }
  if (String(currentValue).toLowerCase() === String(expectedValue).toLowerCase()) {
    console.log(`${label} already set: ${expectedValue}`);
    return null;
  }
  const tx = await action();
  const receipt = await tx.wait();
  console.log(`${label} tx: ${receipt.hash}`);
  return receipt.hash;
}

async function main() {
  const networkName = hre.network.name;
  const tokenName = process.env.TOKEN_NAME || DEFAULTS.tokenName;
  const tokenSymbol = process.env.TOKEN_SYMBOL || DEFAULTS.tokenSymbol;
  const endpointV2 = getEnv("LZ_ENDPOINT_V2", DEFAULTS.endpointV2);

  const [deployer] = await hre.ethers.getSigners();
  const DTTERC20 = await hre.ethers.getContractFactory("DTTERC20");
  const proxy = await hre.upgrades.deployProxy(DTTERC20, [tokenName, tokenSymbol], {
    initializer: "initialize",
    kind: "uups",
    constructorArgs: [endpointV2],
    unsafeAllow: [
      "constructor",
      "state-variable-immutable",
      "missing-initializer-call",
      "incorrect-initializer-order",
    ],
  });

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  const configAddress = process.env.CONFIG_ADDRESS;
  const delegate = process.env.DELEGATE_ADDRESS;
  const issuer = process.env.TOKEN_ISSUER;
  const mintLicensor = process.env.TOKEN_MINT_LICENSOR;
  const mintLimit = process.env.TOKEN_MINT_LIMIT;

  const actions = {};
  actions.setConfig = await maybeSend(
    await proxy.config(),
    configAddress,
    "config",
    () => proxy.setConfig(configAddress)
  );
  actions.setDelegate = delegate
    ? await maybeSend(null, delegate, "delegate", () => proxy.setDelegate(delegate))
    : null;
  actions.setIssuer = configAddress
    ? await maybeSend(await proxy.tokenIssuer(), issuer, "issuer", () => proxy.setIssuer(issuer))
    : null;
  actions.setMintLicensor = configAddress
    ? await maybeSend(
        await proxy.tokenMintLicensor(),
        mintLicensor,
        "tokenMintLicensor",
        () => proxy.setTokenMintLicensor(mintLicensor)
      )
    : null;
  actions.setMintLimit =
    configAddress && mintLimit !== undefined
      ? await maybeSend(await proxy.mintLimit(), mintLimit, "mintLimit", () =>
          proxy.setMintLimit(mintLimit)
        )
      : null;

  const deployment = {
    network: networkName,
    chainId: DEFAULTS.localEid,
    endpointV2,
    proxy: proxyAddress,
    implementation: implementationAddress,
    owner: await proxy.owner(),
    name: tokenName,
    symbol: tokenSymbol,
    deployer: deployer.address,
    config: configAddress || null,
    delegate: delegate || null,
    tokenIssuer: issuer || (await proxy.tokenIssuer()),
    tokenMintLicensor: mintLicensor || (await proxy.tokenMintLicensor()),
    mintLimit: (await proxy.mintLimit()).toString(),
    actions,
  };

  writeLocalDeployment(networkName, deployment);
  console.log(`proxy=${proxyAddress}`);
  console.log(`implementation=${implementationAddress}`);
  console.log(`deploymentFile=deployments/${networkName}/OFT.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
