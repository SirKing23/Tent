const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite runs on web through WebAssembly, which needs wasm assets and
// cross-origin isolation headers so `SharedArrayBuffer` is available.
config.resolver.assetExts.push("wasm");

// The PSGC address lists (~635 KB) ship as an asset so they are only parsed
// when an address picker opens, instead of on every app start.
config.resolver.assetExts.push("psgc");
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: "./global.css" });
