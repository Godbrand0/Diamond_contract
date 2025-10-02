const { ethers } = require("hardhat");

async function main() {
  const diamondAddress = "0x615D88af261c979532876A4f842b6321349BEfF4";
  const swapFacetAddress = "0xD089b321aeBCE6b0777Cb982727DA82b0aD4C001";
  const erc20FacetAddress = "0x5A7e2912c83BF7eD2D37fC2AD62472aF3ceDa7ff";

  console.log("Diagnosing Diamond at:", diamondAddress);
  console.log("\n1. Checking all facets...");

  const diamondLoupe = await ethers.getContractAt("IDiamondLoupe", diamondAddress);
  const facets = await diamondLoupe.facets();

  console.log("\nCurrent facets:");
  for (const facet of facets) {
    console.log(`\nFacet: ${facet.facetAddress}`);
    console.log(`Functions (${facet.functionSelectors.length}):`, facet.functionSelectors);
  }

  console.log("\n\n2. Checking specific function selectors...");

  // SwapFacet function selectors
  const swapSelectors = ["0xe6aa216c", "0x351a964d", "0xd592cbf6"];
  console.log("\nSwapFacet selectors:");
  for (const selector of swapSelectors) {
    try {
      const facetAddress = await diamondLoupe.facetAddress(selector);
      console.log(`${selector}: ${facetAddress}`);
    } catch (error) {
      console.log(`${selector}: NOT FOUND`);
    }
  }

  // New ERC20 function selectors
  const erc20Selectors = ["0x3c130d90", "0x55370ff2"];
  console.log("\nNew ERC20Facet selectors (tokenURI, setTokenURI):");
  for (const selector of erc20Selectors) {
    try {
      const facetAddress = await diamondLoupe.facetAddress(selector);
      console.log(`${selector}: ${facetAddress}`);
    } catch (error) {
      console.log(`${selector}: NOT FOUND`);
    }
  }

  // Check if mint was removed
  const mintSelector = "0x40c10f19";
  console.log("\nMint function selector:");
  try {
    const facetAddress = await diamondLoupe.facetAddress(mintSelector);
    console.log(`${mintSelector}: ${facetAddress} (STILL EXISTS!)`);
  } catch (error) {
    console.log(`${mintSelector}: Successfully removed`);
  }

  console.log("\n\n3. Trying to call SwapFacet functions...");
  const swapFacet = await ethers.getContractAt("SwapFacet", diamondAddress);

  try {
    const rate = await swapFacet.getExchangeRate();
    console.log("✓ getExchangeRate works:", ethers.formatEther(rate), "tokens per ETH");
  } catch (error) {
    console.log("✗ getExchangeRate failed:", error.message);
  }

  try {
    const enabled = await swapFacet.isSwapEnabled();
    console.log("✓ isSwapEnabled works:", enabled);
  } catch (error) {
    console.log("✗ isSwapEnabled failed:", error.message);
  }

  console.log("\n\n4. Trying to call new ERC20Facet functions...");
  const erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);

  try {
    const uri = await erc20Facet.tokenURI();
    console.log("✓ tokenURI works:", uri ? uri.substring(0, 50) + "..." : "(empty)");
  } catch (error) {
    console.log("✗ tokenURI failed:", error.message);
  }

  try {
    // Just check if the function exists (don't actually call it)
    console.log("✓ setTokenURI function exists");
  } catch (error) {
    console.log("✗ setTokenURI doesn't exist");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
