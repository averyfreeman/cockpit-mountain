import { execFileSync } from 'node:child_process';

export function getRuntimeNpmModules(metafile) {
  const bundledPackages = new Set();
  for (const inputPath of Object.keys(metafile.inputs)) {
    const match = inputPath.match(/^node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(@[^/]+\/[^/]+|[^/]+)\//);
    if (match) bundledPackages.add(match[1]);
  }

  const packageVersions = new Map();
  const addDependencies = dependencies => {
    for (const [name, dependency] of Object.entries(dependencies || {})) {
      if (dependency.version) {
        const versions = packageVersions.get(name) || new Set();
        versions.add(dependency.version);
        packageVersions.set(name, versions);
      }
      addDependencies(dependency.dependencies);
      addDependencies(dependency.optionalDependencies);
    }
  };

  const projects = JSON.parse(execFileSync(
    'pnpm',
    ['list', '--prod', '--depth', 'Infinity', '--json'],
    { encoding: 'utf8' },
  ));
  for (const project of projects) addDependencies(project.dependencies);

  const result = [];
  for (const name of [...bundledPackages].sort()) {
    const versions = packageVersions.get(name);
    if (!versions?.size) {
      console.error(`Warning: Could not find version for ${name} in the pnpm workspace`);
      continue;
    }
    for (const version of [...versions].sort()) result.push(`${name} ${version}`);
  }
  return result;
}
