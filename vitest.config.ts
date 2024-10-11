import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

const vitestConfig = defineConfig({
  test: {},
});

export default mergeConfig(viteConfig, vitestConfig);
