const hre = require("hardhat");

async function main() {
  // Diamond Core
  const diamondAddress = "0x615D88af261c979532876A4f842b6321349BEfF4";
  const diamondCutFacetAddress = "0xcd018d90BAB1030F2Cf0E8F90E555C296CedA263";
  const diamondInitAddress = "0x9De7547161ea6dC55770525B760E2f57E545305B";
  const ownerAddress = "0x6dC4F7e7dC254777B8301eF3f89dD7757740c5f7";

  // Facets from upgrade
  const swapFacetAddress = "0xD089b321aeBCE6b0777Cb982727DA82b0aD4C001";
  const erc20FacetAddress = "0x5A7e2912c83BF7eD2D37fC2AD62472aF3ceDa7ff";
  const swapInitAddress = "0x0054F382B7b6A107A9008948E8cd6Ff989ED1E81";

  // Original facets (from initial deployment)
  const diamondLoupeFacetAddress = "0x7197Aca05649106946C918af678ead48140D6477";
  const oldERC20FacetAddress = "0x0AB86F3536e856Bcdc7473bF22460C3eEDE1F76E";

  console.log("Starting verification process...\n");

  try {
    console.log("1. Verifying DiamondCutFacet...");
    await hre.run("verify:verify", {
      address: diamondCutFacetAddress,
      constructorArguments: [],
    });
    console.log("✓ DiamondCutFacet verified\n");
  } catch (error) {
    console.log("DiamondCutFacet verification error:", error.message, "\n");
  }

  try {
    console.log("2. Verifying Diamond...");
    await hre.run("verify:verify", {
      address: diamondAddress,
      constructorArguments: [ownerAddress, diamondCutFacetAddress],
    });
    console.log("✓ Diamond verified\n");
  } catch (error) {
    console.log("Diamond verification error:", error.message, "\n");
  }

  try {
    console.log("3. Verifying DiamondInit...");
    await hre.run("verify:verify", {
      address: diamondInitAddress,
      constructorArguments: [],
    });
    console.log("✓ DiamondInit verified\n");
  } catch (error) {
    console.log("DiamondInit verification error:", error.message, "\n");
  }

  try {
    console.log("4. Verifying DiamondLoupeFacet...");
    await hre.run("verify:verify", {
      address: diamondLoupeFacetAddress,
      constructorArguments: [],
    });
    console.log("✓ DiamondLoupeFacet verified\n");
  } catch (error) {
    console.log("DiamondLoupeFacet verification error:", error.message, "\n");
  }

  try {
    console.log("5. Verifying OLD ERC20Facet (initial deployment)...");
    await hre.run("verify:verify", {
      address: oldERC20FacetAddress,
      constructorArguments: [],
    });
    console.log("✓ OLD ERC20Facet verified\n");
  } catch (error) {
    console.log("OLD ERC20Facet verification error:", error.message, "\n");
  }

  try {
    console.log("6. Verifying NEW ERC20Facet (with tokenURI)...");
    await hre.run("verify:verify", {
      address: erc20FacetAddress,
      constructorArguments: [],
    });
    console.log("✓ NEW ERC20Facet verified\n");
  } catch (error) {
    console.log("NEW ERC20Facet verification error:", error.message, "\n");
  }

  try {
    console.log("7. Verifying SwapFacet...");
    await hre.run("verify:verify", {
      address: swapFacetAddress,
      constructorArguments: [],
    });
    console.log("✓ SwapFacet verified\n");
  } catch (error) {
    console.log("SwapFacet verification error:", error.message, "\n");
  }

  try {
    console.log("8. Verifying SwapInit...");
    await hre.run("verify:verify", {
      address: swapInitAddress,
      constructorArguments: [],
    });
    console.log("✓ SwapInit verified\n");
  } catch (error) {
    console.log("SwapInit verification error:", error.message, "\n");
  }

  console.log("\n✓ Verification process completed!");
  console.log("\nContract Addresses:");
  console.log("═══════════════════════════════════════════════");
  console.log("Diamond:              ", diamondAddress);
  console.log("DiamondCutFacet:      ", diamondCutFacetAddress);
  console.log("DiamondInit:          ", diamondInitAddress);
  console.log("DiamondLoupeFacet:    ", diamondLoupeFacetAddress);
  console.log("OLD ERC20Facet:       ", oldERC20FacetAddress);
  console.log("NEW ERC20Facet:       ", erc20FacetAddress);
  console.log("SwapFacet:            ", swapFacetAddress);
  console.log("SwapInit:             ", swapInitAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});