/*
 * Build script for cockpit-tailscale (esbuild-based, following the Cockpit
 * starter-kit conventions). Replaces the previous webpack setup.
 *
 *   npm run build   -> production build into dist/
 *   npm run watch   -> incremental development build
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

const production = (process.env.NODE_ENV ?? 'development') !== 'development';
const watchMode = process.argv.includes('--watch');

const distdir = 'dist';

/* Redefine PatternFly grid breakpoints to match Cockpit's shell width,
 * see vendor/_global-variables.scss and
 * https://github.com/patternfly/patternfly-react/issues/3815 */
const cockpitBreakpointsPlugin = {
    name: 'cockpit-breakpoints',
    setup(build) {
        build.onLoad({ filter: /\.css$/ }, async (args) => {
            const source = await fs.promises.readFile(args.path, 'utf8');
            const contents = source
                    .replace(/768px/g, '428px')
                    .replace(/992px/g, '652px')
                    .replace(/1200px/g, '876px')
                    .replace(/1450px/g, '1100px');
            return { contents, loader: 'css', resolveDir: path.dirname(args.path) };
        });
    },
};

/* Compile SCSS with the same fake font/icon paths that Cockpit pages use;
 * patternfly-icons-fake-path is rewritten to the fonts served by the
 * cockpit base1 page, so we do not need to ship icon fonts ourselves. */
const stylesPlugins = [
    sassPlugin({
        loadPaths: ['vendor', 'node_modules'],
        quietDeps: true,
        async transform(source, resolveDir, path_) {
            if (path_.includes('patternfly-5-cockpit.scss')) {
                return source
                        .replace(/url.*patternfly-icons-fake-path.*;/g, 'url("../base1/fonts/patternfly.woff") format("woff");')
                        .replace(/@font-face[^}]*patternfly-fonts-fake-path[^}]*}/g, '');
            }
            return source;
        },
    }),
];

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: ['src/index.tsx'],
    outfile: path.join(distdir, 'bundle.js'),
    bundle: true,
    format: 'iife',
    target: 'es2020',
    jsx: 'automatic',
    minify: production,
    sourcemap: !production && 'linked',
    /* rpm spec ships the third-party license notices as %license */
    legalComments: production ? 'external' : 'eof',
    define: {
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
    },
    loader: {
        '.woff': 'file',
        '.woff2': 'file',
        '.ttf': 'file',
        '.eot': 'empty',
        '.svg': 'file',
        '.png': 'file',
        '.jpg': 'file',
        '.gif': 'file',
    },
    assetNames: 'assets/[name]',
    plugins: [...stylesPlugins],
    nodePaths: ['vendor'],
    logLevel: 'info',
};

fs.rmSync(distdir, { recursive: true, force: true });
fs.mkdirSync(distdir, { recursive: true });

/* Static files */
for (const f of ['index.html', 'manifest.json']) {
    fs.copyFileSync(path.join('src', f), path.join(distdir, f));
}

/* Plain .css files are claimed by cockpitBreakpointsPlugin before
 * esbuild-sass-plugin sees them; SCSS goes to the sass compiler. */
options.plugins = [cockpitBreakpointsPlugin, ...options.plugins];

if (watchMode) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
} else {
    await esbuild.build(options);
}
