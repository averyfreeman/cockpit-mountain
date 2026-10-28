import { cockpitVite } from '../../tools/cockpit-vite.mjs';

export default cockpitVite({
    projectRoot: import.meta.dirname,
    entry: 'src/index.html',
    port: 4000,
    manifestPath: 'src/manifest.json',
});
