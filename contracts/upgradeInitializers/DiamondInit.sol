// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibERC20} from "../facets/ERC20Facet.sol";

contract DiamondInit {
    struct Args {
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        address recipient;
    }

    function init(Args memory args) external {
        // Initialize ERC20 storage
        LibERC20.ERC20Storage storage es = LibERC20.erc20Storage();
        es.name = args.name;
        es.symbol = args.symbol;
        es.decimals = args.decimals;
        es.totalSupply = args.initialSupply;
        es.balances[args.recipient] = args.initialSupply;

        // Add more initialization as needed
    }
}