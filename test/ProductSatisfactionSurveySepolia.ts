import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ProductSatisfactionSurvey } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("ProductSatisfactionSurveySepolia", function () {
  let signers: Signers;
  let surveyContract: ProductSatisfactionSurvey;
  let surveyContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const ProductSatisfactionSurveyDeployment = await deployments.get("ProductSatisfactionSurvey");
      surveyContractAddress = ProductSatisfactionSurveyDeployment.address;
      surveyContract = await ethers.getContractAt("ProductSatisfactionSurvey", ProductSatisfactionSurveyDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should create survey and submit ratings on Sepolia", async function () {
    steps = 15;

    this.timeout(4 * 40000);

    progress("Creating survey...");
    const productNames = ["Product A", "Product B"];
    let tx = await surveyContract
      .connect(signers.alice)
      .createSurvey("Sepolia Test Survey", "Test Description", productNames, 24);
    await tx.wait();

    progress("Getting survey count...");
    const surveyCount = await surveyContract.getSurveyCount();
    expect(Number(surveyCount)).to.be.gte(0);

    progress("Encrypting ratings for Product A (rating: 4)...");
    const encryptedRatingA = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(4)
      .encrypt();

    progress("Encrypting ratings for Product B (rating: 5)...");
    const encryptedRatingB = await fhevm
      .createEncryptedInput(surveyContractAddress, signers.alice.address)
      .add32(5)
      .encrypt();

    progress(
      `Call submitRatings() surveyContract=${surveyContractAddress} signer=${signers.alice.address}...`,
    );
    tx = await surveyContract
      .connect(signers.alice)
      .submitRatings(
        0,
        [encryptedRatingA.handles[0], encryptedRatingB.handles[0]],
        [encryptedRatingA.inputProof, encryptedRatingB.inputProof]
      );
    await tx.wait();

    progress("Checking if user has submitted...");
    const hasSubmitted = await surveyContract.hasUserSubmitted(0, signers.alice.address);
    expect(hasSubmitted).to.be.true;

    progress("Getting survey details...");
    const survey = await surveyContract.getSurvey(0);
    expect(survey.totalResponses).to.eq(1);

    progress("Getting encrypted sum for Product A...");
    const encryptedSumA = await surveyContract.getEncryptedSum(0, 0);
    expect(encryptedSumA).to.not.eq(ethers.ZeroHash);

    progress("Decrypting encrypted sum for Product A...");
    const clearSumA = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumA,
      surveyContractAddress,
      signers.alice,
    );
    progress(`Clear sum for Product A: ${clearSumA}`);
    expect(clearSumA).to.eq(4);

    progress("Getting encrypted sum for Product B...");
    const encryptedSumB = await surveyContract.getEncryptedSum(0, 1);
    expect(encryptedSumB).to.not.eq(ethers.ZeroHash);

    progress("Decrypting encrypted sum for Product B...");
    const clearSumB = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSumB,
      surveyContractAddress,
      signers.alice,
    );
    progress(`Clear sum for Product B: ${clearSumB}`);
    expect(clearSumB).to.eq(5);
  });
});

