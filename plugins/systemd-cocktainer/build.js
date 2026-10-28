#!/usr/bin/env node
/* SPDX-License-Identifier: LGPL-2.1-or-later */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { sassPlugin } from 'esbuild-sass-plugin';

const localPkgLib = new URL('./pkg/lib/', import.meta.url);
const workspacePkgLib = new URL('../../cockpit/pkg/lib/', import.meta.url);
const pkgLib = fs.existsSync(new URL('cockpit-po-plugin.js', workspacePkgLib)) ? workspacePkgLib : localPkgLib;
const [{ cleanPlugin }, { cockpitCompressPlugin }, { cockpitPoEsbuildPlugin }] = await Promise.all([
    import(new URL('esbuild-cleanup-plugin.js', pkgLib)),
    import(new URL('esbuild-compress-plugin.js', pkgLib)),
    import(new URL('cockpit-po-plugin.js', pkgLib)),
]);

const { default: esbuild } = await import('esbuild');

const watch = process.argv.includes('--watch');
const production = !watch;

// pkg/lib innehåller cockpit.js, patternfly/patternfly-6-cockpit.scss m.m.
const nodePaths = [fs.existsSync(new URL('../../cockpit/pkg/lib', import.meta.url)) ? '../../cockpit/pkg/lib' : 'pkg/lib'];

const context = await esbuild.context({
    entryPoints: ['src/index.js'],
    bundle: true,
    outdir: 'dist',
    entryNames: 'index',
    // Typsnitt och bilder är externa — serveras från cockpits static/
    external: ['*.woff', '*.woff2', '*.jpg', '*.svg', '../../assets*'],
    legalComments: 'external',
    loader: { '.js': 'jsx', '.sh': 'text' },
    minify: production,
    nodePaths,
    sourcemap: !production,
    target: ['es2020'],
    plugins: [
        cleanPlugin(),
        {
            name: 'copy-assets',
            setup(build) {
                build.onEnd(result => {
                    if (result?.errors.length === 0) {
                        fs.copyFileSync('./src/manifest.json', './dist/manifest.json');
                        fs.copyFileSync('./src/index.html', './dist/index.html');
                    }
                });
            }
        },
        sassPlugin({
            loadPaths: [...nodePaths, 'node_modules'],
            filter: /\.scss/,
            quietDeps: true,
        }),
        cockpitPoEsbuildPlugin(),
        ...production ? [cockpitCompressPlugin()] : [],
    ],
});

try {
    await context.rebuild();
    console.log('Build complete.');
} catch (e) {
    if (production) process.exit(1);
}

if (watch) {
    await context.watch();
    console.log('Watching for changes...');
} else {
    context.dispose();
}
