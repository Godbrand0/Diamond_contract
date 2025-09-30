const { expect } = require("chai");
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

describe("Diamond ERC20 Test", function () {
  let diamond;
  let diamondCutFacet;
  let diamondLoupeFacet;
  let erc20Facet;
  let diamondInit;
  let owner;
  let addr1;
  let addr2;

  before(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
    diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.deployed();

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address, diamondCutFacet.address);
    await diamond.deployed();

    // Deploy DiamondInit
    const DiamondInit = await ethers.getContractFactory("DiamondInit");
    diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();

    // Deploy facets
    const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
    diamondLoupeFacet = await DiamondLoupeFacet.deploy();
    await diamondLoupeFacet.deployed();

    const ERC20Facet = await ethers.getContractFactory("ERC20Facet");
    erc20Facet = await ERC20Facet.deploy();
    await erc20Facet.deployed();

    // Build cut struct
    const cut = [
      {
        facetAddress: diamondLoupeFacet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(diamondLoupeFacet),
      },
      {
        facetAddress: erc20Facet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(erc20Facet),
      },
    ];

    // Initialize ERC20
    const initArgs = {
      name: "Diamond Token",
      symbol: "DMD",
      decimals: 18,
      initialSupply: ethers.utils.parseEther("1000000"),
      recipient: owner.address,
    };

    const diamondInitInterface = new ethers.utils.Interface([
      "function init(tuple(string name, string symbol, uint8 decimals, uint256 initialSupply, address recipient))"
    ]);

    const functionCall = diamondInitInterface.encodeFunctionData("init", [initArgs]);

    // Upgrade diamond with facets
    const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
    const tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
    await tx.wait();
  });

  describe("Diamond Loupe", function () {
    it("should have correct number of facets", async function () {
      const loupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      const facets = await loupe.facets();
      expect(facets.length).to.equal(3); // DiamondCutFacet, DiamondLoupeFacet, ERC20Facet
    });

    it("should return facet addresses", async function () {
      const loupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      const addresses = await loupe.facetAddresses();
      expect(addresses).to.include(diamondCutFacet.address);
      expect(addresses).to.include(diamondLoupeFacet.address);
      expect(addresses).to.include(erc20Facet.address);
    });

    it("should return correct function selectors for facet", async function () {
      const loupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      const selectors = await loupe.facetFunctionSelectors(erc20Facet.address);
      expect(selectors.length).to.be.greaterThan(0);
    });
  });

  describe("ERC20 Functionality", function () {
    it("should have correct name and symbol", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      expect(await token.name()).to.equal("Diamond Token");
      expect(await token.symbol()).to.equal("DMD");
      expect(await token.decimals()).to.equal(18);
    });

    it("should have correct initial supply", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("1000000"));
    });

    it("should have correct initial balance", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const balance = await token.balanceOf(owner.address);
      expect(balance).to.equal(ethers.utils.parseEther("1000000"));
    });

    it("should transfer tokens", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const amount = ethers.utils.parseEther("100");

      await token.transfer(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(
        ethers.utils.parseEther("999900")
      );
    });

    it("should approve and transferFrom", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const amount = ethers.utils.parseEther("50");

      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);

      await token.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      expect(await token.balanceOf(addr2.address)).to.equal(amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it("should mint tokens", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const amount = ethers.utils.parseEther("1000");
      const initialSupply = await token.totalSupply();

      await token.mint(addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseEther("150") // 100 from transfer + 50 from transferFrom + 1000 from mint
      );
      expect(await token.totalSupply()).to.equal(initialSupply.add(amount));
    });

    it("should burn tokens", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      const amount = ethers.utils.parseEther("50");
      const initialBalance = await token.balanceOf(owner.address);
      const initialSupply = await token.totalSupply();

      await token.burn(amount);

      expect(await token.balanceOf(owner.address)).to.equal(initialBalance.sub(amount));
      expect(await token.totalSupply()).to.equal(initialSupply.sub(amount));
    });

    it("should fail transfer with insufficient balance", async function () {
      const token = await ethers.getContractAt("ERC20Facet", diamond.address);
      await expect(
        token.connect(addr2).transfer(addr1.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("Ownership", function () {
    it("should return correct owner", async function () {
      const loupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      expect(await loupe.owner()).to.equal(owner.address);
    });

    it("should transfer ownership", async function () {
      const loupe = await ethers.getContractAt("IDiamondLoupe", diamond.address);
      await loupe.transferOwnership(addr1.address);
      expect(await loupe.owner()).to.equal(addr1.address);

      // Transfer back
      await loupe.connect(addr1).transferOwnership(owner.address);
      expect(await loupe.owner()).to.equal(owner.address);
    });

    it("should prevent non-owner from calling diamondCut", async function () {
      const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
      await expect(
        diamondCut.connect(addr1).diamondCut([], ethers.constants.AddressZero, "0x")
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });
  });
});