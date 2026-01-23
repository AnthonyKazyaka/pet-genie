const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(__dirname, '..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package for changes
config.watchFolders = [
  workspaceRoot,
  path.resolve(workspaceRoot, 'packages/shared'),
];

// Allow importing from outside of mobile directory
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Ensure the shared package is resolved correctly
config.resolver.extraNodeModules = {
  '@pet-genie/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

// Ensure TypeScript files from shared package are transformed
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

module.exports = config;
