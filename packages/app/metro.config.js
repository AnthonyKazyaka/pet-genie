const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages and node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure @pet-genie/core resolves to the workspace package
config.resolver.disableHierarchicalLookup = false;

// Configure server to handle web properly
config.server = {
  ...config.server,
  rewriteRequestUrl: (url) => {
    // Force disable lazy loading for web to avoid import.meta issues
    if (url.includes('platform=web') && url.includes('lazy=true')) {
      return url.replace('lazy=true', 'lazy=false');
    }
    return url;
  },
};

module.exports = config;
