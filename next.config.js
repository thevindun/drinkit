/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MediaPipe WASM assets are loaded from CDN at runtime; no server needed.
};
module.exports = nextConfig;
