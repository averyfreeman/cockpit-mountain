import { cockpitVite } from '../../tools/cockpit-vite.mjs';

export default cockpitVite({
    projectRoot: import.meta.dirname,
    entry: 'src/index.jsx',
    outDir: 'port-forward',
    port: 8080,
    publicDir: 'public',
    resolveCockpitModule: true,
    aliases: ({ command }) => ({
        'firewalld-api': new URL(
            command === 'serve' ? './src/firewalld-api-mock.js' : './src/firewalld-api.js',
            import.meta.url,
        ).pathname,
    }),
    library: {
        name: 'CockpitPortForward',
        fileName: 'port-forward.js',
        cssFileName: 'port-forward',
        external: ['cockpit'],
        globals: { cockpit: 'cockpit' },
    },
});
