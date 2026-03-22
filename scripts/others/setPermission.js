const { ethers } = require('hardhat')
const fs = require("fs");
const db = require('../flowCli/db.js')
const {reOrganizeTokens} = require("../flowCli/utl");

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
async function setContractConfig(contractName, contractAddress, configAddress) {
    const contract = await getContractInstance(contractName, contractAddress)
    await contract.setConfig(configAddress)
    console.log(`${contractName}的Config设置成功`)
}

async function getContractInstance(contractName, contractAddress) {
    const Contract = await ethers.getContractAt(contractName, contractAddress);
    return Contract
}

async function main () {
    console.log("start")
    const users = ["0xea8e1ac00f786aafb9ff85321096d52e678eae4f","0x8243d85c3452bd361c466ea0c8b4adc14f181edb","0x20abd7d31687cafdd61b9a97ac90722268d8653a","0xd4fa2e2ab025813a264eeb326e89cc7ec23bb7f1"]
    for (const user of users) {
        const RORTokenC = await getContractInstance('UserPermission', "0x395EB6a7d29670e8DF715640f3BB75B1F7491091")
        var tx = await RORTokenC.setPermission(
            "0x5e9Bf06f39733d447D1435ea14860D4792F6b6De",
            user,
            9999999,
            "")
        // 等待交易被包含在区块链中
        const receipt = await tx.wait();

        if (receipt.status === 1) {
            console.log('Transaction was successful!');
        } else {
            console.log('Transaction failed.');
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
