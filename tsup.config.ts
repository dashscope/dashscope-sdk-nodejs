import { defineConfig } from 'tsup';

/** ESM bundles have no `__dirname`; match Node’s CJS layout for `getSdkVersion()`. */
const esmDirnameBanner = `import { fileURLToPath as __furl } from 'url';
import { dirname as __pdir } from 'path';
const __dirname = __pdir(__furl(import.meta.url));
`;

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  outDir: 'lib',
  outExtension({ format }) {
    return format === 'esm' ? { js: '.mjs' } : { js: '.js' };
  },
  external: ['axios', 'ws'],
  treeshake: true,
  esbuildOptions(options, context) {
    if (context.format === 'esm') {
      options.banner = { js: esmDirnameBanner };
    }
  },
});
