// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {LibERC20} from "./ERC20Facet.sol";

library LibSwap {
    bytes32 constant SWAP_STORAGE_POSITION = keccak256("diamond.standard.swap.storage");

    struct SwapStorage {
        uint256 exchangeRate; // tokens per 1 ETH (in wei)
        bool swapEnabled;
    }

    function swapStorage() internal pure returns (SwapStorage storage ss) {
        bytes32 position = SWAP_STORAGE_POSITION;
        assembly {
            ss.slot := position
        }
    }
}

contract SwapFacet {
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event SwapRateUpdated(uint256 newRate);
    event SwapStatusUpdated(bool enabled);

    /// @notice Swap ETH for tokens at the configured rate
    /// @dev Automatically mints tokens to the sender based on ETH sent
    receive() external payable {
        _swapETHForTokens();
    }

    /// @notice Swap ETH for tokens
    function swapETHForTokens() external payable {
        _swapETHForTokens();
    }

    /// @notice Get the current exchange rate
    /// @return The number of tokens per 1 ETH
    function getExchangeRate() external view returns (uint256) {
        LibSwap.SwapStorage storage ss = LibSwap.swapStorage();
        return ss.exchangeRate;
    }

    /// @notice Check if swapping is enabled
    /// @return Whether swapping is currently enabled
    function isSwapEnabled() external view returns (bool) {
        return LibSwap.swapStorage().swapEnabled;
    }

    /// @notice Internal function to handle ETH to token swaps
    function _swapETHForTokens() internal {
        LibSwap.SwapStorage storage ss = LibSwap.swapStorage();
        require(ss.swapEnabled, "SwapFacet: Swapping is disabled");
        require(msg.value > 0, "SwapFacet: Must send ETH");

        // Calculate token amount: (ETH amount * exchange rate) / 1 ether
        uint256 tokenAmount = (msg.value * ss.exchangeRate) / 1 ether;
        require(tokenAmount > 0, "SwapFacet: Token amount too small");

        // Mint tokens to the buyer
        _mint(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    /// @notice Internal mint function (copied from ERC20Facet for internal use)
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        LibERC20.ERC20Storage storage es = LibERC20.erc20Storage();
        es.totalSupply += amount;
        unchecked {
            es.balances[account] += amount;
        }
        // Note: We don't emit Transfer event here as it should be emitted by the facet
    }
}
