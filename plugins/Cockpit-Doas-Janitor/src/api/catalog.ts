import { spawnBackend } from "./backend";

export async function loadCommandCatalog() {
  const out = await spawnBackend(["catalog"]);
  return JSON.parse(out);
}
