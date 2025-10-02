# Diamond Contract Upgrade Notes

## Changes Made

### 1. SwapFacet Implementation
- **Location**: `contracts/facets/SwapFacet.sol`
- **Features**:
  - ETH to token swap functionality
  - Exchange rate: 1000 tokens per 1 ETH
  - `swapETHForTokens()` function
  - `receive()` function for direct ETH transfers
  - `getExchangeRate()` to check current rate
  - `isSwapEnabled()` to check swap status
- **Initializer**: `contracts/upgradeInitializers/SwapInit.sol`

### 2. ERC20Facet Updates
- **Location**: `contracts/facets/ERC20Facet.sol`
- **Changes**:
  - ❌ **Removed** public `mint()` function (no longer accessible to users)
  - ✅ **Added** `tokenURI()` function to retrieve SVG metadata
  - ✅ **Added** `setTokenURI(string memory _tokenURI)` function to set SVG metadata
  - ✅ **Updated** storage to include `tokenURI` field

### 3. DiamondInit Updates
- **Location**: `contracts/upgradeInitializers/DiamondInit.sol`
- **Changes**:
  - Added `tokenURI` parameter to initialization arguments
  - Initializes token metadata on deployment

### 4. Deployment Scripts

#### New Deployment (`scripts/deploy.js`)
Deploys a complete Diamond with:
- DiamondCutFacet
- DiamondLoupeFacet
- ERC20Facet (with tokenURI support)
- SwapFacet (with 1000 tokens per ETH rate)

**Usage**:
```bash
npx hardhat run scripts/deploy.js --network <network>
```

#### Upgrade Script (`scripts/upgrade.js`)
Upgrades an existing Diamond by:
- Adding SwapFacet
- Replacing ERC20Facet with updated version
- Initializing swap functionality

**Usage**:
```bash
DIAMOND_ADDRESS=<your-diamond-address> npx hardhat run scripts/upgrade.js --network <network>
```

## Key Features

### ETH to Token Swap
Users can swap ETH for tokens in two ways:

1. **Call `swapETHForTokens()` function**:
   ```javascript
   await diamond.swapETHForTokens({ value: ethers.parseEther("1") });
   // User receives 1000 tokens
   ```

2. **Send ETH directly to the Diamond contract**:
   ```javascript
   await signer.sendTransaction({
     to: diamondAddress,
     value: ethers.parseEther("1")
   });
   // User receives 1000 tokens
   ```

### Token Metadata (SVG)
Set and retrieve token SVG metadata:

```javascript
// Set tokenURI (can include SVG data URI)
await diamond.setTokenURI("data:image/svg+xml;base64,<base64_encoded_svg>");

// Get tokenURI
const uri = await diamond.tokenURI();
```

### Security Changes
- The `mint()` function has been removed from public access
- Only the SwapFacet can internally mint tokens when users swap ETH
- This prevents unauthorized token minting

## Testing

After deployment or upgrade, verify:

1. **ERC20 functionality**:
   ```bash
   npx hardhat console --network <network>
   ```
   ```javascript
   const diamond = await ethers.getContractAt("ERC20Facet", "<diamond-address>");
   console.log(await diamond.name());
   console.log(await diamond.symbol());
   console.log(await diamond.totalSupply());
   ```

2. **Swap functionality**:
   ```javascript
   const swap = await ethers.getContractAt("SwapFacet", "<diamond-address>");
   console.log(await swap.getExchangeRate()); // Should be 1000 * 10^18
   console.log(await swap.isSwapEnabled()); // Should be true
   ```

3. **Perform a test swap**:
   ```javascript
   const tx = await swap.swapETHForTokens({ value: ethers.parseEther("0.1") });
   await tx.wait();
   // Check balance increased by 100 tokens
   ```

## Diamond Standard Compliance

All implementations follow the EIP-2535 Diamond Standard:
- ✅ DiamondCutFacet for upgrades
- ✅ DiamondLoupeFacet for introspection
- ✅ Proper storage isolation using LibDiamond and LibERC20
- ✅ Function selector routing
- ✅ Upgrade/replace/remove facet capabilities

## Notes

- The `tokenURI` can be set at deployment or later using `setTokenURI()`
- Exchange rate is configurable during initialization
- Swap functionality can be enabled/disabled through initialization
- The Diamond pattern allows for future upgrades without redeployment
