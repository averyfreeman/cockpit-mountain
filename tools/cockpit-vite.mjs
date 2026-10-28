import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const helperDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = existsSync(resolve(helperDirectory, 'package.json'))
    ? helperDirectory
    : resolve(helperDirectory, '..');
const workspaceCockpitLib = resolve(repositoryRoot, 'cockpit/pkg/lib');
const isMonorepo = existsSync(workspaceCockpitLib);

export function cockpitVite(options) {
    const projectRoot = resolve(options.projectRoot);
    const cockpitLib = isMonorepo ? workspaceCockpitLib : resolve(projectRoot, 'pkg/lib');
    const entry = resolve(projectRoot, options.entry);
    const isLibrary = Boolean(options.library);
    const root = isLibrary ? projectRoot : dirname(entry);
    const outDir = resolve(projectRoot, options.outDir ?? 'dist');
    const manifestPath = options.manifestPath ? resolve(projectRoot, options.manifestPath) : null;

    return defineConfig(({ command, mode }) => {
        const aliases = [
            { find: 'cockpit-dark-theme', replacement: resolve(cockpitLib, 'cockpit-dark-theme.ts') },
            { find: 'pkg/lib', replacement: cockpitLib },
        ];

        if (options.resolveCockpitModule)
            aliases.push({ find: 'cockpit', replacement: resolve(cockpitLib, 'cockpit.js') });

        for (const [find, replacement] of Object.entries(options.aliases?.({ command, mode }) ?? {}))
            aliases.push({ find, replacement });

        const plugins = [react()];
        if (manifestPath) {
            plugins.push({
                name: 'cockpit-manifest',
                generateBundle() {
                    this.emitFile({
                        type: 'asset',
                        fileName: 'manifest.json',
                        source: readFileSync(manifestPath, 'utf8'),
                    });
                },
            });
        }

        const build = isLibrary ? {
            outDir,
            emptyOutDir: true,
            sourcemap: true,
            copyPublicDir: true,
            lib: {
                entry,
                name: options.library.name,
                formats: ['iife'],
                fileName: () => options.library.fileName,
                cssFileName: options.library.cssFileName,
            },
            rollupOptions: {
                external: options.library.external ?? [],
                output: { globals: options.library.globals ?? {} },
            },
        } : {
            outDir,
            emptyOutDir: true,
            sourcemap: true,
            rollupOptions: {
                input: entry,
                output: {
                    entryFileNames: 'bundle.js',
                    assetFileNames: asset => asset.name?.endsWith('.css')
                        ? 'bundle.css'
                        : 'assets/[name]-[hash][extname]',
                },
            },
        };

        return {
            root,
            plugins,
            resolve: { alias: aliases },
            publicDir: options.publicDir ? resolve(projectRoot, options.publicDir) : false,
            build,
            server: {
                host: '0.0.0.0',
                port: options.port ?? 4000,
                fs: { allow: [isMonorepo ? repositoryRoot : projectRoot, projectRoot] },
            },
        };
    });
}
