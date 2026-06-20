import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// On GitHub Pages a *project* site is served from https://<user>.github.io/<repo>,
// so every asset/link must be prefixed with `/<repo>`. The deploy workflow passes
// this via `actions/configure-pages` (PAGES_BASE_PATH). Empty in local dev so the
// site works at http://localhost:3000 with no prefix.
const basePath = process.env.PAGES_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  basePath,
  // Static export can't run the on-demand Image Optimization server.
  images: { unoptimized: true },
  // Expose the prefix to client components (e.g. the static search fetch).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default withMDX(config);
