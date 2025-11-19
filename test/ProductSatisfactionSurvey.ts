import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ProductSatisfactionSurvey, ProductSatisfactionSurvey__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ProductSatisfactionSurvey")) as ProductSatisfactionSurvey__factory;
  const surveyContract = (await factory.deploy()) as ProductSatisfactionSurvey;
  const surveyContractAddress = await surveyContract.getAddress();

  return { surveyContract, surveyContractAddress };
}

describe("ProductSatisfactionSurvey", function () {
  let signers: Signers;
  let surveyContract: ProductSatisfactionSurvey;
  let surveyContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0], 
      alice: ethSigners[1], 
      bob: ethSigners[2],
      charlie: ethSigners[3]
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ surveyContract, surveyContractAddress } = await deployFixture());
  });

  it("should create a survey successfully", async function () {
    const productNames = ["Product A", "Product B", "Product C"];
    const tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    const surveyCount = await surveyContract.getSurveyCount();
    expect(surveyCount).to.eq(1);

    const survey = await surveyContract.getSurvey(0);
    expect(survey.title).to.eq("Test Survey");
    expect(survey.productCount).to.eq(3);
    expect(survey.isActive).to.be.true;
  });

  it("should submit encrypted ratings", async function () {
    // Create survey
    const productNames = ["Product A", "Product B"];
    let tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    // Alice submits ratings: Product A = 4, Product B = 5
    const ratingA = 4;
    const ratingB = 5;

    const encryptedRatingA = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(ratingA)
      .encrypt();

    const encryptedRatingB = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(ratingB)
      .encrypt();

    tx = await surveyContract
      .connect(signers.alice)
      .submitRatings(
        0,
        [encryptedRatingA.handles[0], encryptedRatingB.handles[0]],
        [encryptedRatingA.inputProof, encryptedRatingB.inputProof]
      );
    await tx.wait();

    // Check that Alice has submitted
    const hasSubmitted = await surveyContract.hasUserSubmitted(0, signers.alice.address);
    expect(hasSubmitted).to.be.true;

    const survey = await surveyContract.getSurvey(0);
    expect(survey.totalResponses).to.eq(1);
  });

  it("should aggregate encrypted ratings from multiple users", async function () {
    // Create survey
    const productNames = ["Product A", "Product B"];
    let tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    // Alice submits: Product A = 4, Product B = 5
    const aliceRatingA = 4;
    const aliceRatingB = 5;

    const aliceEncryptedA = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(aliceRatingA)
      .encrypt();

    const aliceEncryptedB = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(aliceRatingB)
      .encrypt();

    tx = await surveyContract
      .connect(signers.alice)
      .submitRatings(
        0,
        [aliceEncryptedA.handles[0], aliceEncryptedB.handles[0]],
        [aliceEncryptedA.inputProof, aliceEncryptedB.inputProof]
      );
    await tx.wait();

    // Bob submits: Product A = 3, Product B = 4
    const bobRatingA = 3;
    const bobRatingB = 4;

    const bobEncryptedA = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.bob.address)
      .add32(bobRatingA)
      .encrypt();

    const bobEncryptedB = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.bob.address)
      .add32(bobRatingB)
      .encrypt();

    tx = await surveyContract
      .connect(signers.bob)
      .submitRatings(
        0,
        [bobEncryptedA.handles[0], bobEncryptedB.handles[0]],
        [bobEncryptedA.inputProof, bobEncryptedB.inputProof]
      );
    await tx.wait();

    // Get encrypted sums
    const encryptedSumA = await surveyContract.getEncryptedSum(0, 0);
    const encryptedSumB = await surveyContract.getEncryptedSum(0, 1);

    // Decrypt sums (admin can decrypt)
    const clearSumA = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumA,
      surveyContractAddress,
      signers.deployer,
    );

    const clearSumB = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumB,
      surveyContractAddress,
      signers.deployer,
    );

    // Verify sums: Product A = 4 + 3 = 7, Product B = 5 + 4 = 9
    expect(clearSumA).to.eq(7);
    expect(clearSumB).to.eq(9);

    const survey = await surveyContract.getSurvey(0);
    expect(survey.totalResponses).to.eq(2);
  });

  it("should prevent double submission", async function () {
    // Create survey
    const productNames = ["Product A", "Product B"];
    let tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    // Alice submits ratings
    const ratingA = 4;
    const ratingB = 5;

    const encryptedRatingA = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(ratingA)
      .encrypt();

    const encryptedRatingB = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(ratingB)
      .encrypt();

    tx = await surveyContract
      .connect(signers.alice)
      .submitRatings(
        0,
        [encryptedRatingA.handles[0], encryptedRatingB.handles[0]],
        [encryptedRatingA.inputProof, encryptedRatingB.inputProof]
      );
    await tx.wait();

    // Try to submit again - should fail
    await expect(
      surveyContract
        .connect(signers.alice)
        .submitRatings(
          0,
          [encryptedRatingA.handles[0], encryptedRatingB.handles[0]],
          [encryptedRatingA.inputProof, encryptedRatingB.inputProof]
        )
    ).to.be.revertedWith("Already submitted ratings for this survey");
  });

  it("should end survey after end time", async function () {
    // Create survey with 1 hour duration
    const productNames = ["Product A", "Product B"];
    let tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 1);
    await tx.wait();

    // Fast forward time by 2 hours
    await ethers.provider.send("evm_increaseTime", [2 * 3600]);
    await ethers.provider.send("evm_mine", []);

    // End survey
    tx = await surveyContract.connect(signers.alice).endSurvey(0);
    await tx.wait();

    const survey = await surveyContract.getSurvey(0);
    expect(survey.isActive).to.be.false;
  });

  it("should calculate average scores correctly", async function () {
    // Create survey
    const productNames = ["Product A", "Product B", "Product C"];
    let tx = await surveyContract
      .connect(signers.deployer)
      .createSurvey("Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    // Alice: A=5, B=4, C=3
    const aliceRatings = [5, 4, 3];
    const aliceEncrypted = await Promise.all(
      aliceRatings.map(rating =>
        fhevm
          .createEncryptedInput(surveyContractAddress, signers.alice.address)
          .add32(rating)
          .encrypt()
      )
    );

    tx = await surveyContract
      .connect(signers.alice)
      .submitRatings(
        0,
        aliceEncrypted.map(e => e.handles[0]),
        aliceEncrypted.map(e => e.inputProof)
      );
    await tx.wait();

    // Bob: A=4, B=5, C=4
    const bobRatings = [4, 5, 4];
    const bobEncrypted = await Promise.all(
      bobRatings.map(rating =>
        fhevm
          .createEncryptedInput(surveyContractAddress, signers.bob.address)
          .add32(rating)
          .encrypt()
      )
    );

    tx = await surveyContract
      .connect(signers.bob)
      .submitRatings(
        0,
        bobEncrypted.map(e => e.handles[0]),
        bobEncrypted.map(e => e.inputProof)
      );
    await tx.wait();

    // Charlie: A=3, B=3, C=5
    const charlieRatings = [3, 3, 5];
    const charlieEncrypted = await Promise.all(
      charlieRatings.map(rating =>
        fhevm
          .createEncryptedInput(surveyContractAddress, signers.charlie.address)
          .add32(rating)
          .encrypt()
      )
    );

    tx = await surveyContract
      .connect(signers.charlie)
      .submitRatings(
        0,
        charlieEncrypted.map(e => e.handles[0]),
        charlieEncrypted.map(e => e.inputProof)
      );
    await tx.wait();

    // Decrypt sums
    const encryptedSumA = await surveyContract.getEncryptedSum(0, 0);
    const encryptedSumB = await surveyContract.getEncryptedSum(0, 1);
    const encryptedSumC = await surveyContract.getEncryptedSum(0, 2);

    const clearSumA = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumA,
      surveyContractAddress,
      signers.deployer,
    );

    const clearSumB = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumB,
      surveyContractAddress,
      signers.deployer,
    );

    const clearSumC = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumC,
      surveyContractAddress,
      signers.deployer,
    );

    // Verify sums: A = 5+4+3 = 12, B = 4+5+3 = 12, C = 3+4+5 = 12
    expect(clearSumA).to.eq(12);
    expect(clearSumB).to.eq(12);
    expect(clearSumC).to.eq(12);

    // Average = 12 / 3 = 4.0 for all products
    // This would be calculated in the frontend after decryption
  });
});

