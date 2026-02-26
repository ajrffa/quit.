// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Fix: Metro can fail to resolve modules when the project root directory
// contains a dot (e.g., "quit."). Explicitly set the project root and 
// ensure node_modules resolution works correctly.
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
];

// Ensure Metro doesn't mistake the project folder dot as a file extension
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
