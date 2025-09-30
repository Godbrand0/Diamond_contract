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

async function deployDiamond() {
  const accounts = await ethers.getSigners();
  const contractOwner = accounts[0];

  console.log("Deploying Diamond...");
  console.log("Owner:", contractOwner.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);

  // Deploy DiamondCutFacet
  console.log("\n1. Deploying DiamondCutFacet...");
  const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.waitForDeployment();
  const diamondCutFacetAddress = await diamondCutFacet.getAddress();
  console.log("✓ DiamondCutFacet deployed:", diamondCutFacetAddress);

  // Deploy Diamond
  console.log("\n2. Deploying Diamond...");
  const Diamond = await ethers.getContractFactory("Diamond");
  const diamond = await Diamond.deploy(
    contractOwner.address,
    diamondCutFacetAddress
  );
  await diamond.waitForDeployment();
  const diamondAddress = await diamond.getAddress();
  console.log("✓ Diamond deployed:", diamondAddress);

  // Deploy DiamondInit
  console.log("\n3. Deploying DiamondInit...");
  const DiamondInit = await ethers.getContractFactory("DiamondInit");
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.waitForDeployment();
  const diamondInitAddress = await diamondInit.getAddress();
  console.log("✓ DiamondInit deployed:", diamondInitAddress);

  // Deploy facets
  console.log("\n4. Deploying facets...");
  const FacetNames = ["DiamondLoupeFacet", "ERC20Facet"];
  const cut = [];

  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.waitForDeployment();
    const facetAddress = await facet.getAddress();
    console.log(`✓ ${FacetName} deployed: ${facetAddress}`);

    const selectors = getSelectors(facet);
    console.log(`  → Function selectors (${selectors.length}):`, selectors);

    cut.push({
      facetAddress: facetAddress,
      action: FacetCutAction.Add,
      functionSelectors: selectors,
    });
  }

  // Initialize ERC20
  const initArgs = {
    name: "Godbrand",
    symbol: "GBD",
    decimals: 18,
    initialSupply: ethers.parseEther("1000000"),
    recipient: contractOwner.address,
  };

  const diamondInitInterface = new ethers.Interface([
    "function init(tuple(string name, string symbol, uint8 decimals, uint256 initialSupply, address recipient))"
  ]);

  const functionCall = diamondInitInterface.encodeFunctionData("init", [initArgs]);

  // Upgrade diamond with facets
  console.log("\n5. Executing Diamond Cut...");
  const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);
  const tx = await diamondCut.diamondCut(cut, diamondInitAddress, functionCall);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("✓ Diamond cut completed successfully");

  // Test the diamond
  console.log("\n6. Testing Diamond...");
  const erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
  
  const [name, symbol, totalSupply, balance] = await Promise.all([
    erc20Facet.name(),
    erc20Facet.symbol(),
    erc20Facet.totalSupply(),
    erc20Facet.balanceOf(contractOwner.address)
  ]);

  console.log("\n✓ Deployment Summary:");
  console.log("═══════════════════════");
  console.log("Diamond:          ", diamondAddress);
  console.log("DiamondCutFacet:  ", diamondCutFacetAddress);
  console.log("DiamondInit:      ", diamondInitAddress);
  console.log("\nToken Details:");
  console.log("Name:             ", name);
  console.log("Symbol:           ", symbol);
  console.log("Total Supply:     ", ethers.formatEther(totalSupply), symbol);
  console.log("Owner Balance:    ", ethers.formatEther(balance), symbol);

  return {
    diamond: diamondAddress,
    diamondCutFacet: diamondCutFacetAddress,
    diamondInit: diamondInitAddress,
    owner: contractOwner.address
  };
}

if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n❌ Deployment failed:");
      console.error(error);
      process.exit(1);
    });
}

exports.deployDiamond = deployDiamond;