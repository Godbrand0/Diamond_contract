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

async function upgradeDiamond() {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  // Replace with your deployed diamond address
  const diamondAddress = process.env.DIAMOND_ADDRESS;

  if (!diamondAddress) {
    throw new Error("Please set DIAMOND_ADDRESS environment variable");
  }

  console.log("Upgrading Diamond at:", diamondAddress);
  console.log("Owner:", contractOwner.address);

  // Example: Deploy a new facet
  console.log("\nDeploying new facet...");
  const NewFacet = await ethers.getContractFactory("ERC20Facet"); // Replace with your new facet
  const newFacet = await NewFacet.deploy();
  await newFacet.deployed();
  console.log("New facet deployed:", newFacet.address);

  // Prepare diamond cut
  const cut = [
    {
      facetAddress: newFacet.address,
      action: FacetCutAction.Add, // Use Replace to update existing functions
      functionSelectors: getSelectors(newFacet),
    },
  ];

  // Execute diamond cut
  console.log("\nExecuting diamond cut...");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, "0x");
  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  console.log("Diamond upgrade completed successfully");
  console.log("Transaction hash:", tx.hash);

  // Verify upgrade
  console.log("\nVerifying upgrade...");
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();

  console.log("\nCurrent facets:");
  for (const facet of facets) {
    console.log(`${facet.facetAddress}: ${facet.functionSelectors.length} functions`);
  }
}

// Example: Remove functions
async function removeFunctions(diamondAddress, selectorsToRemove) {
  const cut = [
    {
      facetAddress: ethers.constants.AddressZero,
      action: FacetCutAction.Remove,
      functionSelectors: selectorsToRemove,
    },
  ];

  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cut, ethers.constants.AddressZero, "0x");
  await tx.wait();
  console.log("Functions removed successfully");
}

if (require.main === module) {
  upgradeDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

exports.upgradeDiamond = upgradeDiamond;
exports.removeFunctions = removeFunctions;