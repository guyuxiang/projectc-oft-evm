//SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../libraries/Constants.sol";

abstract contract TokenPermission {
    // Credit Door
    modifier CreditDoorTransfer(uint256 permission) {
        if (permission % 10 <= 1) {
            revert(ErrorCode.SCM_Permission_Token_Transfer_ERROR);
        }
        _;
    }

    modifier CreditDoorMint(uint256 permission) {
        if (permission % 10 <= 1) {
            revert(ErrorCode.SCM_Permission_Token_Mint_ERROR);
        }
        _;
    }

    // Debit Door
    modifier DebitDoor(uint256 permission) {
        if (permission / 10 % 10 <= 1) {
            revert(ErrorCode.SCM_Permission_Token_Debit_ERROR);
        }
        _;
    }
}

abstract contract EncashPermission {
    error EncashContractPermissionError(address addr);

    // Encash Door
    modifier EncashDoor(uint256 permission) {
        if (permission / 100 % 10 <= 1) {
            revert(ErrorCode.SCM_Permission_Encash_ERROR);
        }
        _;
    }
}
