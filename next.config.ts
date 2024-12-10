const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  // Automatically set the basePath and assetPrefix for GitHub Pages deployment
  const repo = process.env.GITHUB_REPOSITORY?.replace(/.*?\//, '') || '';
  assetPrefix = `/${repo}/`;  // for example, '/krakow-airport/'
  basePath = `/${repo}`;       // for example, '/krakow-airport'
}

module.exports = {
  reactStrictMode: true,
  assetPrefix,    // Ensures assets like images, CSS, and JS are correctly referenced
  basePath,       // Ensures the app is served correctly from a subdirectory on GitHub Pages
  output: 'export',  // Required to use static export
  images: {
    unoptimized: true,  // If you're using images and not optimizing them
  },
};
