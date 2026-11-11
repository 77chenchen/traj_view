import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const results = join(root, 'test-results');

const require = createRequire(import.meta.url);
const sharedModules = join(homedir(), 'Documents/ChatGPT/traj/frontend/node_modules');

export function resolveFrontendDependency(name, override) {
  if (override) {
    const path = resolve(override);
    return require.resolve(existsSync(join(path, name)) ? join(path, name) : path);
  }

  const candidates = process.env.FRONTEND_NODE_MODULES
    ? [resolve(process.env.FRONTEND_NODE_MODULES)]
    : [join(root, 'frontend/node_modules'), sharedModules];

  for (const modules of candidates) {
    const path = join(modules, name);
    if (existsSync(path)) return require.resolve(path);
  }
  throw new Error(`Missing ${name}. Use installed frontend dependencies or set FRONTEND_NODE_MODULES.`);
}

export function frontendRequire(name, override) {
  return require(resolveFrontendDependency(name, override));
}

export function packageInfo(name, entry = resolveFrontendDependency(name)) {
  let path = dirname(entry);
  while (true) {
    const manifest = join(path, 'package.json');
    if (existsSync(manifest)) {
      const info = require(manifest);
      if (info.name === name) return { path, ...info };
    }
    const parent = dirname(path);
    if (parent === path) throw new Error(`Package manifest missing for ${name}`);
    path = parent;
  }
}
