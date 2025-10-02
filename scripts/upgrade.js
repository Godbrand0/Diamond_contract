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
  const diamondAddress = "0x615D88af261c979532876A4f842b6321349BEfF4";

  if (!diamondAddress) {
    throw new Error("Please set DIAMOND_ADDRESS environment variable");
  }

  console.log("Upgrading Diamond at:", diamondAddress);
  console.log("Owner:", contractOwner.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  const cut = [];

  // Deploy SwapFacet
  console.log("\n1. Deploying SwapFacet...");
  const SwapFacet = await ethers.getContractFactory("SwapFacet");
  const swapFacet = await SwapFacet.deploy();
  await swapFacet.waitForDeployment();
  const swapFacetAddress = await swapFacet.getAddress();
  console.log("✓ SwapFacet deployed:", swapFacetAddress);

  const swapSelectors = getSelectors(swapFacet);
  console.log(`  → Function selectors (${swapSelectors.length}):`, swapSelectors);

  cut.push({
    facetAddress: swapFacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: swapSelectors,
  });

  // Deploy updated ERC20Facet with tokenURI support
  console.log("\n2. Deploying updated ERC20Facet...");
  const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
  const erc20Facet = await ERC20Facet.deploy();
  await erc20Facet.waitForDeployment();
  const erc20FacetAddress = await erc20Facet.getAddress();
  console.log("✓ ERC20Facet deployed:", erc20FacetAddress);

  // Get only the NEW functions to add (tokenURI and setTokenURI with no parameters)
  const newERC20Functions = [
    erc20Facet.interface.getFunction("tokenURI()").selector,
    erc20Facet.interface.getFunction("setTokenURI()").selector
  ];
  console.log(`  → New function selectors (${newERC20Functions.length}):`, newERC20Functions);

  cut.push({
    facetAddress: erc20FacetAddress,
    action: FacetCutAction.Add,
    functionSelectors: newERC20Functions,
  });

  // Remove the old mint function (if it exists)
  console.log("\n3. Checking for mint function to remove...");
  try {
    // Get the mint function selector from the diamond
    const mintSelector = "0x40c10f19"; // mint(address,uint256) selector
    console.log(`  → Removing selector: ${mintSelector}`);

    cut.push({
      facetAddress: ethers.ZeroAddress,
      action: FacetCutAction.Remove,
      functionSelectors: [mintSelector],
    });
  } catch (error) {
    console.log("  → No mint function found (may have been removed already)");
  }

  // Deploy SwapInit
  console.log("\n4. Deploying SwapInit...");
  const SwapInit = await ethers.getContractFactory("SwapInit");
  const swapInit = await SwapInit.deploy();
  await swapInit.waitForDeployment();
  const swapInitAddress = await swapInit.getAddress();
  console.log("✓ SwapInit deployed:", swapInitAddress);

  // Initialize SwapFacet with 1000 tokens per 1 ETH
  const initArgs = {
    exchangeRate: ethers.parseEther("1000"), // 1000 tokens per 1 ETH
    swapEnabled: true,
  };

  const swapInitInterface = new ethers.Interface([
    "function init(tuple(uint256 exchangeRate, bool swapEnabled))"
  ]);

  const functionCall = swapInitInterface.encodeFunctionData("init", [initArgs]);

  // Execute diamond cut
  console.log("\n5. Executing Diamond Cut...");
  console.log("  - Adding SwapFacet");
  console.log("  - Adding tokenURI and setTokenURI to ERC20Facet");
  console.log("  - Removing mint function from ERC20Facet");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cut, swapInitAddress, functionCall);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();

  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }

  console.log("✓ Diamond upgrade completed successfully");

  // Verify upgrade
  console.log("\n6. Verifying upgrade...");
  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();

  console.log("\n✓ Upgrade Summary:");
  console.log("═══════════════════════");
  console.log("Diamond:          ", diamondAddress);
  console.log("SwapFacet:        ", swapFacetAddress);
  console.log("ERC20Facet:       ", erc20FacetAddress);
  console.log("SwapInit:         ", swapInitAddress);

  console.log("\nCurrent facets:");
  for (const facet of facets) {
    let facetName = "Unknown";
    if (facet.facetAddress.toLowerCase() === swapFacetAddress.toLowerCase()) {
      facetName = "SwapFacet";
    } else if (facet.facetAddress.toLowerCase() === erc20FacetAddress.toLowerCase()) {
      facetName = "ERC20Facet (tokenURI functions)";
    }
    console.log(`${facet.facetAddress} (${facetName}): ${facet.functionSelectors.length} functions`);
  }

  // Test SwapFacet and new ERC20 functions
  console.log("\n7. Testing upgraded functionality...");
  const swapFacetContract = await ethers.getContractAt("SwapFacet", diamondAddress);
  const erc20FacetContract = await ethers.getContractAt("ERC20Facet", diamondAddress);

  const [exchangeRate, isEnabled, tokenURI] = await Promise.all([
    swapFacetContract.getExchangeRate(),
    swapFacetContract.isSwapEnabled(),
    erc20FacetContract.tokenURI()
  ]);

  console.log("Exchange Rate:    ", ethers.formatEther(exchangeRate), "tokens per ETH");
  console.log("Swap Enabled:     ", isEnabled);
  console.log("Token URI:        ", tokenURI || "(empty - can be set later)");

  // Verify mint function is removed
  console.log("\n8. Verifying mint function removal...");
  try {
    await erc20FacetContract.mint.staticCall(ethers.ZeroAddress, 0);
    console.log("⚠️  WARNING: mint function still exists!");
  } catch (error) {
    console.log("✓ mint function successfully removed");
  }

  return {
    diamond: diamondAddress,
    swapFacet: swapFacetAddress,
    erc20Facet: erc20FacetAddress,
    swapInit: swapInitAddress
  };
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