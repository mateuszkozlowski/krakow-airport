import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  const repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, '');
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

module.exports = {
  reactStrictMode: true,
  assetPrefix,
  basePath,
};