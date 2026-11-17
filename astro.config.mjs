import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { thinPaths } from './src/lib/digest.ts';

const THIN = new Set(thinPaths().map((p) => `https://pahadpariksha.in${p}`));

export default defineConfig({
  site: 'https://pahadpariksha.in',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/search/') && !THIN.has(page),
    }),
  ],
});
