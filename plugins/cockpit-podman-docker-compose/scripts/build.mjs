import {
  createEsbuildConfig,
  copyPatternFlyAssets,
  writeThirdPartyNotices,
} from "@rxtx4816/cockpit-plugin-base-react/esbuild.config.base";
import * as esbuild from "esbuild";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureNotices, NOTICES_PATH } from "./ensure-notices.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pnpmHelperUrl = new URL("../../../tools/with-pnpm-flat-dependencies.mjs", import.meta.url);
const withPnpmFlatDependencies = existsSync(pnpmHelperUrl)
  ? (await import(pnpmHelperUrl.href)).withPnpmFlatDependencies
  : null;

await copyPatternFlyAssets("src/assets");

// The notices JSON is derived from the metafile of the build that also bundles it
// (AppFooter imports it for the licenses modal), so build twice: the first pass tells
// us which packages actually got bundled, the second embeds the resulting notices.
// It converges in exactly two passes — importing a JSON file pulls in no npm package,
// so the bundled set is identical either way.
await ensureNotices();

const result = await esbuild.build(
  createEsbuildConfig({ entryPoint: "src/index.tsx", metafile: true }),
);

const writeNotices = () => writeThirdPartyNotices({
  metafile: result.metafile,
  product: "cockpit-compose",
  // The .txt stays at the repo root for packaging (%doc, debian/docs, PKGBUILD);
  // the JSON goes where the bundle can import it, with the license texts included.
  textOut: resolve(projectRoot, "THIRD-PARTY-NOTICES.txt"),
  jsonOut: resolve(projectRoot, NOTICES_PATH),
  includeText: true,
  strict: true,
});

if (withPnpmFlatDependencies)
  await withPnpmFlatDependencies(result.metafile, writeNotices);
else
  await writeNotices();

await esbuild.build(createEsbuildConfig({ entryPoint: "src/index.tsx" }));
