const { ethers } = require('hardhat')

async function main() {
    let tx = await (await ethers.getSigners())[0].sendTransaction({to: "0xc4217a5C642e007B2Bb8F04D2b98F096092f20c4", value: ethers.parseEther("0.2")})
    let receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`set failed: ${tx.hash}`)
    }
}

async function getContractInstance(contractName, contractAddress) {
    const Contract = await ethers.getContractAt(contractName, contractAddress);
    return Contract
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })