# ERC20 Upgradeable Diamond Contract (EIP-2535)

This project implements an upgradeable ERC20 token using the Diamond Standard (EIP-2535), allowing for modular and upgradeable smart contracts.

## Overview

The Diamond Standard (EIP-2535) enables a single contract to use multiple implementation contracts (facets) and allows upgrading functionality without changing the contract address. This implementation combines the Diamond pattern with ERC20 token functionality.

## Architecture

### Core Components

- **Diamond.sol**: The main proxy contract that delegates calls to facets
- **DiamondCutFacet.sol**: Manages adding, replacing, and removing facets
- **DiamondLoupeFacet.sol**: Provides introspection functions to query the diamond
- **LibDiamond.sol**: Library containing diamond storage and internal functions
- **ERC20Facet.sol**: ERC20 token implementation as a facet

### Directory Structure

```
project-root/
├── contracts/
│   ├── Diamond.sol
│   ├── facets/
│   │   ├── DiamondCutFacet.sol
│   │   ├── DiamondLoupeFacet.sol
│   │   └── ERC20Facet.sol
│   ├── interfaces/
│   │   ├── IDiamondCut.sol
│   │   └── IDiamondLoupe.sol
│   ├── libraries/
│   │   └── LibDiamond.sol
│   └── upgradeInitializers/
│       └── DiamondInit.sol
├── scripts/
│   ├── deploy.js
│   └── upgrade.js
├── test/
│   └── diamondTest.js
└── hardhat.config.js
```

## Prerequisites

- Node.js (v14+ recommended)
- npm or yarn
- Hardhat

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Diamond_contract
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key_here
ETHERSCAN_API_KEY=your_etherscan_key_here
```

## Configuration

Edit [hardhat.config.js](hardhat.config.js) to configure networks:

```javascript
networks: {
  hardhat: {},
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

## Deployment Process

### 1. Deploy the Diamond

The deployment happens in stages:

```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

Deployment steps:
1. Deploy DiamondCutFacet (upgrade facet)
2. Deploy Diamond contract with DiamondCutFacet
3. Deploy DiamondInit (initialization contract)
4. Deploy additional facets (DiamondLoupeFacet, ERC20Facet)
5. Execute diamondCut to add facets to the Diamond

### 2. Verify Contracts (Optional)

```bash
npx hardhat verify --network <network-name> <contract-address>
```

## Upgrading the Diamond

To add, replace, or remove functions:

```bash
npx hardhat run scripts/upgrade.js --network <network-name>
```

The upgrade script:
1. Deploys new facet contract
2. Prepares diamondCut data (function selectors + facet address)
3. Executes diamondCut transaction

## Testing

Run the test suite:

```bash
npx hardhat test
```

Run specific test file:

```bash
npx hardhat test test/diamondTest.js
```

Run with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

## Key Concepts

### Diamond Cut

The `diamondCut` function is used to add, replace, or remove functions:

```solidity
enum FacetCutAction {Add, Replace, Remove}

struct FacetCut {
    address facetAddress;
    FacetCutAction action;
    bytes4[] functionSelectors;
}
```

### Storage Pattern

Uses Diamond Storage pattern to avoid storage collisions between facets:

```solidity
bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");
```

### Function Selectors

Each function is identified by its 4-byte selector. The diamond routes calls based on these selectors to the appropriate facet.

## Common Commands

| Command | Description |
|---------|-------------|
| `npx hardhat compile` | Compile contracts |
| `npx hardhat test` | Run tests |
| `npx hardhat run scripts/deploy.js` | Deploy diamond |
| `npx hardhat run scripts/upgrade.js` | Upgrade diamond |
| `npx hardhat node` | Start local node |
| `npx hardhat clean` | Clear cache and artifacts |

## Interacting with the Diamond

After deployment, interact with the diamond using the combined ABI of all facets:

```javascript
const diamond = await ethers.getContractAt('ERC20Facet', diamondAddress);
await diamond.transfer(recipientAddress, amount);
```

## Benefits of Diamond Standard

1. **Unlimited Contract Size**: Bypass 24KB contract size limit
2. **Upgradeable**: Add, replace, or remove functions
3. **Single Address**: Maintain same address through upgrades
4. **Modular**: Organize code into logical facets
5. **Gas Efficient**: Share code between contracts

## Security Considerations

- Always audit facets before deployment
- Implement proper access controls on diamondCut
- Test upgrades on testnet first
- Consider using a timelock for upgrades
- Use multi-sig for ownership

## Resources

- [EIP-2535 Specification](https://eips.ethereum.org/EIPS/eip-2535)
- [Nick Mudge's Diamond Implementation](https://github.com/mudgen/diamond)
- [Reference Implementation](https://github.com/casweeney/ERC20-Upgradeable-Diamond-Contract-EIP-2535)

## License

MIT



Diamond:           0x615D88af261c979532876A4f842b6321349BEfF4
DiamondCutFacet:   0xcd018d90BAB1030F2Cf0E8F90E555C296CedA263
DiamondInit:       0x9De7547161ea6dC55770525B760E2f57E545305B