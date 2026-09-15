const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.join(repoRoot, "packages/core"),
  path.join(repoRoot, "convex"),
];

config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@glowcose/core": path.join(repoRoot, "packages/core/src"),
  // convex pulls @clerk/shared@3 to the top level; @clerk/expo needs v4.
  "@clerk/shared": path.join(
    projectRoot,
    "node_modules/@clerk/expo/node_modules/@clerk/shared",
  ),
};

module.exports = config;
