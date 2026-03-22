//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Config is Ownable {
    address public userPermission;
    address public encash;
    address public idFactoryAddress;
    address public governorAddress;
    // mapping(address => address) public tokenOwner;
    mapping(address => address) public tokenSuspense;

    event SetSuspense(address token, address suspense);

    modifier onlyGovernor() {
        if (msg.sender != governorAddress) {
            revert("onlyGovernor");
        }
        _;
    }

    constructor(
        address _userPermission,
        address _dtt,
        address _encash,
        address _rorEnhancement,
        address _rorMarket,
        address _rorAddress,
        address _idFactoryAddress,
        address _governor
    ) Ownable(msg.sender) {
        userPermission = _userPermission;
        encash = _encash;
        idFactoryAddress = _idFactoryAddress;
        governorAddress = _governor;
    }

    function setUserPermission(address _userPermission) public onlyGovernor returns (bool) {
        userPermission = _userPermission;
        return true;
    }

    function getSuspense(address token) public view returns (address) {
        return tokenSuspense[token];
    }

    function setSuspense(address token, address suspense) public onlyGovernor returns (bool) {
        tokenSuspense[token] = suspense;
        emit SetSuspense(token, suspense);
        return true;
    }
}
