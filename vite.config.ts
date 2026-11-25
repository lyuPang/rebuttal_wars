import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

function singleFile(): Plugin {
  return {
    name: 'rebuttal-wars-single-file',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const scripts: string[] = [];
      const styles: string[] = [];
      const leftovers: string[] = [];

      for (const [file, output] of Object.entries(bundle)) {
        if (output.type === 'chunk') {
          if (file.endsWith('.js') || file.endsWith('.mjs')) {
            scripts.push(output.code);
            delete bundle[file];
          }
        } else if (file.endsWith('.css')) {
          styles.push(String(output.source));
          delete bundle[file];
        } else if (!file.endsWith('.html')) {
          leftovers.push(file);
        }
      }

      if (leftovers.length) {
        this.warn(`未能内联的产物：${leftovers.join(', ')}`);
      }

      const js = scripts
        .join('\n')
        .replace(/<\/script/gi, '<\\/script')
        .replace(/<!--/g, '<\\!--');
      const css = styles.join('\n').replace(/<\/style/gi, '<\\/style');

      for (const file of Object.keys(bundle)) {
        const html = bundle[file];
        if (html.type !== 'asset' || !file.endsWith('.html')) continue;

        let source = String(html.source)
          .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>\s*/gi, '')
          .replace(/<script\b[^>]*\bsrc=[^>]*>\s*<\/script>\s*/gi, '');

        source = source.replace(/<\/head>/i, () => `<style>\n${css}\n</style>\n</head>`);
        source = source.replace(
          /<\/body>/i,
          () => `<script type="module">\n${js}\n</script>\n</body>`,
        );

        html.source = source;
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';

  return {
    base: './',
    plugins: [react(), ...(standalone ? [singleFile()] : [])],
    server: { host: true },
    build: standalone
      ? {
          outDir: 'dist-standalone',
          emptyOutDir: true,
          assetsInlineLimit: 64 * 1024 * 1024,
          cssCodeSplit: false,
          reportCompressedSize: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {},
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
