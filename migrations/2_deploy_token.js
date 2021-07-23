const SolarisToken = artifacts.require("SolarisToken");

module.exports = function (deployer) {
  deployer.deploy(SolarisToken);
};
