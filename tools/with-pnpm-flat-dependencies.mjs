import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function packageNameAndRoot(inputPath, cwd) {
    const absolutePath = path.resolve(cwd, inputPath);
    const marker = `${path.sep}node_modules${path.sep}`;
    const index = absolutePath.lastIndexOf(marker);
    if (index < 0)
        return null;

    const packagePath = absolutePath.slice(index + marker.length);
    const parts = packagePath.split(path.sep);
    if (parts.length === 0)
        return null;

    let packageName;
    if (parts[0].startsWith("@")) {
        if (parts.length < 2)
            return null;
        packageName = `${parts[0]}/${parts[1]}`;
    } else {
        packageName = parts[0];
    }

    const packageRoot = path.join(absolutePath.slice(0, index + marker.length), packageName);
    const manifestPath = path.join(packageRoot, "package.json");
    if (!existsSync(manifestPath))
        return null;

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return manifest.name === packageName ? { packageName, packageRoot, version: manifest.version } : null;
}

/**
 * Temporarily expose bundled pnpm packages through a flat node_modules view.
 * This lets existing license-reporting tools that expect npm's layout inspect
 * the exact packages represented in an esbuild metafile.
 */
export async function withPnpmFlatDependencies(metafile, callback) {
    const cwd = process.cwd();
    const packages = new Map();

    for (const inputPath of Object.keys(metafile?.inputs ?? {})) {
        const packageInfo = packageNameAndRoot(inputPath, cwd);
        if (!packageInfo)
            continue;

        const previous = packages.get(packageInfo.packageName);
        if (previous && previous.version !== packageInfo.version) {
            throw new Error(`Multiple bundled versions of ${packageInfo.packageName}: ${previous.version} and ${packageInfo.version}`);
        }
        packages.set(packageInfo.packageName, packageInfo);
    }

    const tempRoot = mkdtempSync(path.join(os.tmpdir(), "cockpit-mountain-node-modules-"));
    const modulesRoot = path.join(tempRoot, "node_modules");

    try {
        for (const { packageName, packageRoot } of packages.values()) {
            const linkPath = path.join(modulesRoot, packageName);
            mkdirSync(path.dirname(linkPath), { recursive: true });
            symlinkSync(packageRoot, linkPath, "dir");
        }

        process.chdir(tempRoot);
        return await callback();
    } finally {
        process.chdir(cwd);
        rmSync(tempRoot, { recursive: true, force: true });
    }
}
