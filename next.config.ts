const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  const repo = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, '') || ''; // Fallback to empty string
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig = {
  reactStrictMode: true,
  assetPrefix,
  basePath,
};

export default nextConfig;
