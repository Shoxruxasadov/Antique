const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// __d / module resolution xatosini bartaraf etish (Hermes + package exports)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
