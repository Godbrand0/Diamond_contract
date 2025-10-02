// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibSwap} from "../facets/SwapFacet.sol";

contract SwapInit {
    struct Args {
        uint256 exchangeRate; // tokens per 1 ETH
        bool swapEnabled;
    }

    function init(Args memory args) external {
        // Initialize Swap storage
        LibSwap.SwapStorage storage ss = LibSwap.swapStorage();
        ss.exchangeRate = args.exchangeRate;
        ss.swapEnabled = args.swapEnabled;
    }
}
