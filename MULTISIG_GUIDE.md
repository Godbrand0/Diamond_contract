# MultisigFacet Deployment & Usage Guide

## Overview

The MultisigFacet adds multi-signature wallet functionality to your Diamond contract. This allows multiple owners to collectively approve and execute transactions, adding an extra layer of security.

## Features

- **Multiple Owners**: Support for multiple wallet owners
- **Required Confirmations**: Configurable number of confirmations needed to execute transactions
- **Transaction Management**: Submit, confirm, revoke, and execute transactions
- **Owner Management**: Add/remove owners through multi-sig approval
- **Full Transparency**: View transaction details, confirmations, and owner list

---

## Deployment

### Step 1: Deploy MultisigFacet to Existing Diamond

```bash
# Without initialization (you'll initialize later)
DIAMOND_ADDRESS=<your-diamond-address> npx hardhat run scripts/add-multisig.js --network <network>

# With initialization (sets up owners immediately)
DIAMOND_ADDRESS=<your-diamond-address> INITIALIZE_MULTISIG=true npx hardhat run scripts/add-multisig.js --network <network>
```

**Before running with initialization**, edit `scripts/add-multisig.js` line 79-82 to set your actual owner addresses:

```javascript
const owners = [
  contractOwner.address,
  "0xYourSecondOwnerAddress", // Replace this
  "0xYourThirdOwnerAddress",  // Add more as needed
];
const requiredConfirmations = 2; // Adjust as needed
```

### Step 2: Initialize MultisigFacet (if not done during deployment)

```javascript
const diamond = await ethers.getContractAt("MultiSigFacet", diamondAddress);

const owners = [
  "0xOwner1Address",
  "0xOwner2Address",
  "0xOwner3Address"
];
const requiredConfirmations = 2; // 2 out of 3 owners must approve

await diamond.initializeMultiSig(owners, requiredConfirmations);
```

---

## Usage Examples

### 1. Submit a Transaction

Any owner can submit a transaction for approval:

```javascript
const diamond = await ethers.getContractAt("MultiSigFacet", diamondAddress);

// Example: Transfer 1 ETH to an address
const txId = await diamond.submitTransaction(
  "0xRecipientAddress",           // to
  ethers.parseEther("1"),          // value (1 ETH)
  "0x"                             // data (empty for simple transfer)
);

console.log("Transaction submitted with ID:", txId);
```

### 2. Confirm a Transaction

Other owners must confirm the transaction:

```javascript
// Owner 2 confirms
const diamond2 = await ethers.getContractAt("MultiSigFacet", diamondAddress);
await diamond2.confirmTransaction(txId);
```

### 3. Execute a Transaction

Once enough confirmations are received, any owner can execute:

```javascript
await diamond.executeTransaction(txId);
```

### 4. Revoke a Confirmation

Owners can revoke their confirmation before execution:

```javascript
await diamond.revokeConfirmation(txId);
```

### 5. View Transaction Details

```javascript
const [to, value, data, executed, confirmations] = await diamond.getTransaction(txId);

console.log("To:", to);
console.log("Value:", ethers.formatEther(value), "ETH");
console.log("Executed:", executed);
console.log("Confirmations:", confirmations);
```

### 6. View All Owners

```javascript
const owners = await diamond.getOwners();
console.log("Multisig Owners:", owners);
```

### 7. Check if Address is Owner

```javascript
const isOwner = await diamond.isOwner("0xAddressToCheck");
console.log("Is Owner:", isOwner);
```

### 8. Get Confirmation Status

```javascript
const [count, owners] = await diamond.getConfirmations(txId);
console.log("Confirmation count:", count);
console.log("Owners who confirmed:", owners);
```

---

## Advanced: Modifying Multisig Settings

### Add a New Owner

This requires multi-sig approval (must go through submitTransaction):

```javascript
// Step 1: Encode the function call
const addOwnerData = diamond.interface.encodeFunctionData("addOwner", [
  "0xNewOwnerAddress"
]);

// Step 2: Submit as a transaction to the diamond itself
const txId = await diamond.submitTransaction(
  diamondAddress,  // to: the diamond itself
  0,               // value: 0
  addOwnerData     // data: encoded function call
);

// Step 3: Other owners confirm
await diamond2.confirmTransaction(txId);
await diamond3.confirmTransaction(txId);

// Step 4: Execute once enough confirmations
await diamond.executeTransaction(txId);
```

### Remove an Owner

```javascript
const removeOwnerData = diamond.interface.encodeFunctionData("removeOwner", [
  "0xOwnerToRemove"
]);

const txId = await diamond.submitTransaction(
  diamondAddress,
  0,
  removeOwnerData
);

// Follow confirmation and execution steps...
```

### Change Required Confirmations

```javascript
const changeReqData = diamond.interface.encodeFunctionData("changeRequirement", [
  3  // New requirement (e.g., 3 confirmations needed)
]);

const txId = await diamond.submitTransaction(
  diamondAddress,
  0,
  changeReqData
);

// Follow confirmation and execution steps...
```

---

## Complete Workflow Example

Here's a complete example of submitting and executing a transaction:

```javascript
const { ethers } = require("hardhat");

async function multiSigExample() {
  const [owner1, owner2, owner3] = await ethers.getSigners();
  const diamondAddress = "0xYourDiamondAddress";

  // Connect as owner1
  const diamond1 = await ethers.getContractAt("MultiSigFacet", diamondAddress, owner1);

  // Step 1: Owner1 submits a transaction to send 0.5 ETH
  console.log("Owner1: Submitting transaction...");
  const tx = await diamond1.submitTransaction(
    "0xRecipientAddress",
    ethers.parseEther("0.5"),
    "0x"
  );
  const receipt = await tx.wait();

  // Get transaction ID from event
  const event = receipt.logs.find(log =>
    log.topics[0] === diamond1.interface.getEvent("TransactionSubmitted").topicHash
  );
  const txId = event.args.txId;
  console.log("Transaction ID:", txId.toString());

  // Step 2: Owner2 confirms
  console.log("\nOwner2: Confirming transaction...");
  const diamond2 = await ethers.getContractAt("MultiSigFacet", diamondAddress, owner2);
  await diamond2.confirmTransaction(txId);

  // Step 3: Check confirmations (if required = 2, we can execute now)
  const [count, confirmedOwners] = await diamond1.getConfirmations(txId);
  console.log("\nConfirmations:", count.toString());
  console.log("Confirmed by:", confirmedOwners);

  // Step 4: Execute the transaction
  console.log("\nOwner1: Executing transaction...");
  await diamond1.executeTransaction(txId);
  console.log("✓ Transaction executed successfully!");

  // Step 5: Verify execution
  const [to, value, data, executed, confirmations] = await diamond1.getTransaction(txId);
  console.log("\nFinal Status:");
  console.log("Executed:", executed);
  console.log("Confirmations:", confirmations.toString());
}

multiSigExample().catch(console.error);
```

---

## Security Considerations

1. **Choose Owners Carefully**: Only add trusted addresses as owners
2. **Set Appropriate Requirements**: Balance between security and usability
   - Too low (1 of 3): Less secure
   - Too high (3 of 3): Risky if one owner loses access
3. **Verify Transaction Details**: Always check transaction details before confirming
4. **Test on Testnet First**: Deploy and test on testnet before mainnet

---

## Events

Monitor these events to track multi-sig activity:

- `OwnerAdded(address indexed owner)`
- `OwnerRemoved(address indexed owner)`
- `RequirementChanged(uint256 required)`
- `TransactionSubmitted(uint256 indexed txId, address indexed submitter, address to, uint256 value, bytes data)`
- `TransactionConfirmed(uint256 indexed txId, address indexed owner)`
- `TransactionRevoked(uint256 indexed txId, address indexed owner)`
- `TransactionExecuted(uint256 indexed txId, address indexed executor)`
- `TransactionFailed(uint256 indexed txId)`

---

## Function Reference

### Setup Functions
- `initializeMultiSig(address[] owners, uint256 required)` - Initialize the multi-sig

### Transaction Functions
- `submitTransaction(address to, uint256 value, bytes data)` - Submit new transaction
- `confirmTransaction(uint256 txId)` - Confirm a transaction
- `revokeConfirmation(uint256 txId)` - Revoke your confirmation
- `executeTransaction(uint256 txId)` - Execute a confirmed transaction

### Management Functions (require multi-sig approval)
- `addOwner(address owner)` - Add a new owner
- `removeOwner(address owner)` - Remove an owner
- `changeRequirement(uint256 required)` - Change required confirmations

### View Functions
- `getOwners()` - Get list of all owners
- `getTransactionCount()` - Get total transaction count
- `getTransaction(uint256 txId)` - Get transaction details
- `isOwner(address)` - Check if address is an owner
- `isConfirmed(uint256 txId, address owner)` - Check if owner confirmed transaction
- `getConfirmations(uint256 txId)` - Get confirmation details for transaction

---

## Troubleshooting

**Error: "Not a multisig owner"**
- Only addresses in the owners list can call multi-sig functions

**Error: "Transaction does not exist"**
- Check that the transaction ID is valid

**Error: "Not enough confirmations"**
- Wait for more owners to confirm before executing

**Error: "Transaction already executed"**
- The transaction has already been executed and cannot be executed again

