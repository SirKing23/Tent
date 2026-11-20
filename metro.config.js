const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// expo-sqlite runs on web through WebAssembly, which needs wasm assets and
// cross-origin isolation headers so `SharedArrayBuffer` is available.
config.resolver.assetExts.push("wasm");
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: "./global.css" });
