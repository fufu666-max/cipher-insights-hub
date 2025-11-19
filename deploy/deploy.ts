import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedProductSatisfactionSurvey = await deploy("ProductSatisfactionSurvey", {
    from: deployer,
    log: true,
  });

  console.log(`ProductSatisfactionSurvey contract: `, deployedProductSatisfactionSurvey.address);
};
export default func;
func.id = "deploy_productSatisfactionSurvey"; // id required to prevent reexecution
func.tags = ["ProductSatisfactionSurvey"];
