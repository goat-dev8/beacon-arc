import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const part = (...pieces) => pieces.join("");

export const BANNED = [
  part("0", "g.ai"),
  part("evm", "rpc.0", "g.ai"),
  part("W", "0G"),
  part("Aris", "totle"),
  part("Tee", "ML"),
  part("Cos", "ton2"),
  part("USD", "T0"),
  part("FT", "SO"),
  part("FX", "RP"),
  part("Layer", "Zero"),
  part("Fla", "re"),
];

const ROOTS = ["packages", "apps", "scripts"];
const SKIP = [`packages${sep()}contracts${sep()}lib`, `packages${sep()}contracts${sep()}out`, `packages${sep()}contracts${sep()}cache`];

function sep() {
  return process.platform === "win32" ? "\\" : "/";
}

export function findBans(text) {
  return BANNED.filter((word) => text.includes(word));
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const rel = relative(process.cwd(), full);
    if (SKIP.some((part) => rel.includes(part))) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs|sol|json)$/.test(name) && !/\.test\./.test(name)) {
      out.push(full);
    }
  }
}

export function scanRuntime(cwd = process.cwd()) {
  const files = [];
  for (const root of ROOTS) walk(join(cwd, root), files);
  const hits = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const found = findBans(text);
    if (found.length) hits.push({ file, found });
  }
  return hits;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const hits = scanRuntime();
  if (hits.length) {
    for (const hit of hits) console.error(`${hit.file}: ${hit.found.join(", ")}`);
    process.exit(1);
  }
  console.log("guard-bans: clean");
}
