const hre = require("hardhat");

async function main() {
  const diamondAddress = "0x615D88af261c979532876A4f842b6321349BEfF4";
  const diamondCutFacetAddress = "0xcd018d90BAB1030F2Cf0E8F90E555C296CedA263";
  const diamondInitAddress = "0x9De7547161ea6dC55770525B760E2f57E545305B";
  const ownerAddress = "0x6dC4F7e7dC254777B8301eF3f89dD7757740c5f7"; // Get from deployment logs

  console.log("Verifying DiamondCutFacet...");
  await hre.run("verify:verify", {
    address: diamondCutFacetAddress,
    constructorArguments: [],
  });

  console.log("Verifying Diamond...");
  await hre.run("verify:verify", {
    address: diamondAddress,
    constructorArguments: [ownerAddress, diamondCutFacetAddress],
  });

  console.log("Verifying DiamondInit...");
  await hre.run("verify:verify", {
    address: diamondInitAddress,
    constructorArguments: [],
  });

  // Add other facets addresses from your deployment logs
  console.log("Verifying DiamondLoupeFacet...");
  await hre.run("verify:verify", {
    address: "LOUPE_FACET_ADDRESS",
    constructorArguments: [],
  });

  console.log("Verifying ERC20Facet...");
  await hre.run("verify:verify", {
    address: "ERC20_FACET_ADDRESS",
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});