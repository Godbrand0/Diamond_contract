const { ethers } = require("hardhat");

function getSelectors(contract) {
  const selectors = [];
  for (const fragment of contract.interface.fragments) {
    if (fragment.type === 'function' && fragment.name !== 'init') {
      selectors.push(contract.interface.getFunction(fragment.name).selector);
    }
  }
  return selectors;
}

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

async function addMultiSigFacet() {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // Replace with your deployed diamond address
  const diamondAddress = process.env.DIAMOND_ADDRESS || "0x615D88af261c979532876A4f842b6321349BEfF4";

  console.log("Adding MultiSigFacet to Diamond at:", diamondAddress);
  console.log("Owner:", contractOwner.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  const cut = [];

  // Deploy MultiSigFacet
  console.log("\n1. Deploying MultiSigFacet...");
  const MultiSigFacet = await ethers.getContractFactory("MultiSigFacet");
  const multiSigFacet = await MultiSigFacet.deploy();
  await multiSigFacet.waitForDeployment();
  const multiSigFacetAddress = await multiSigFacet.getAddress();
  console.log("✓ MultiSigFacet deployed:", multiSigFacetAddress);

  const multiSigSelectors = getSelectors(multiSigFacet);
  console.log(`  → Function selectors (${multiSigSelectors.length}):`, multiSigSelectors);

  cut.push({
    facetAddress: multiSigFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: multiSigSelectors,
  });

  // Execute diamond cut (without initialization - will initialize separately)
  console.log("\n2. Executing Diamond Cut...");
  console.log("  - Adding MultiSigFacet");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, "0x");
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  console.log("✓ MultiSigFacet added successfully");

  // Verify upgrade
  console.log("\n3. Verifying upgrade...");
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();

  console.log("\nCurrent facets:");
  for (const facet of facets) {
    let facetName = "Unknown";
    if (facet.facetAddress.toLowerCase() === multiSigFacetAddress.toLowerCase()) {
      facetName = "MultiSigFacet";
    }
    console.log(`${facet.facetAddress} (${facetName}): ${facet.functionSelectors.length} functions`);
  }

  // Initialize MultiSig (optional - only if you want to set it up now)
  const initializeNow = process.env.INITIALIZE_MULTISIG === "true";

  if (initializeNow) {
    console.log("\n4. Initializing MultiSig...");
    const multiSigContract = await ethers.getContractAt("MultiSigFacet", diamondAddress);

    // Example: Set up multi-sig with 2 owners requiring 2 confirmations
    // Modify these addresses as needed
    const owners = [
      contractOwner.address,
      // Add more owner addresses here
      "0xADaF4e678BcDfb626a439bD18f67F3475539c055", // Replace with actual address
      "Fr2UxGztUSmKcST8ZaTvF4drUG1ZRjQwrACYNk8wHr6d"
    ];
    const requiredConfirmations = 2;

    console.log(`  → Setting up ${owners.length} owners with ${requiredConfirmations} required confirmations`);
    const initTx = await multiSigContract.initializeMultiSig(owners, requiredConfirmations);
    await initTx.wait();
    console.log("✓ MultiSig initialized successfully");

    // Verify initialization
    const actualOwners = await multiSigContract.getOwners();
    console.log("  → Owners:", actualOwners);
  } else {
    console.log("\n4. MultiSig not initialized (set INITIALIZE_MULTISIG=true to initialize)");
    console.log("   You can initialize later by calling initializeMultiSig()");
  }

  console.log("\n✓ Deployment Summary:");
  console.log("═══════════════════════");
  console.log("Diamond:          ", diamondAddress);
  console.log("MultiSigFacet:    ", multiSigFacetAddress);

  if (initializeNow) {
    const multiSigContract = await ethers.getContractAt("MultiSigFacet", diamondAddress);
    const owners = await multiSigContract.getOwners();
    console.log("\nMultiSig Setup:");
    console.log("Owners:           ", owners);
  }

  return {
    diamond: diamondAddress,
    multiSigFacet: multiSigFacetAddress,
  };
}

if (require.main === module) {
  addMultiSigFacet()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

exports.addMultiSigFacet = addMultiSigFacet;
