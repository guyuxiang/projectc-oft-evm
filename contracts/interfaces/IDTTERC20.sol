// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.20;

interface IDTTERC20 {
    function balanceOf(address account) external view returns (uint256);

    function burn(uint256 amount, string memory txID) external;

    function getIssuer() external view returns (address);

    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external;

    function symbol() external view returns (string memory);

    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    function verifyCreditDoorTransfer(address verifyAddress) external view;

    function verifyDebitDoor(address verifyAddress) external view;
}
