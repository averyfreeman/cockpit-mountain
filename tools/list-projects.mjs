import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const output = execFileSync("pnpm", ["list", "--recursive", "--depth", "-1", "--json"], {
    cwd: root,
    encoding: "utf8",
});

const projects = JSON.parse(output)
    .filter(project => path.resolve(project.path) !== root)
    .map(project => ({
        name: project.name ?? "(unnamed)",
        path: path.relative(root, project.path).split(path.sep).join("/"),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

console.log("Workspace projects:");
for (const project of projects)
    console.log(`${project.name.padEnd(34)} ${project.path}`);
