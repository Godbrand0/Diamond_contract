const hre = require("hardhat");

async function main() {
  // Replace with your deployed MultisigFacet address
  const multiSigFacetAddress = process.env.MULTISIG_FACET_ADDRESS || "REPLACE_WITH_DEPLOYED_ADDRESS";

  if (multiSigFacetAddress === "REPLACE_WITH_DEPLOYED_ADDRESS") {
    console.error("Please set MULTISIG_FACET_ADDRESS environment variable or update the script");
    process.exit(1);
  }

  console.log("Starting MultisigFacet verification...\n");

  try {
    console.log("Verifying MultiSigFacet at:", multiSigFacetAddress);
    await hre.run("verify:verify", {
      address: multiSigFacetAddress,
      constructorArguments: [],
    });
    console.log("✓ MultiSigFacet verified successfully\n");
  } catch (error) {
    console.log("MultiSigFacet verification error:", error.message, "\n");
  }

  console.log("✓ Verification completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
