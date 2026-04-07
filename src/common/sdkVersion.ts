import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

let cached: string | undefined;

function resolvePackageJsonPath(): string {
  let dir: string = __dirname;
  for (let i = 0; i < 8; i++) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const meta = JSON.parse(readFileSync(pkg, 'utf-8')) as { name?: string };
        if (meta.name === 'dashscope-sdk-official') {
          return pkg;
        }
      } catch {
        /* continue */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error('dashscope-sdk-official: could not locate package.json');
}

/** SDK semver from the published (or workspace) package.json. */
export function getSdkVersion(): string {
  if (cached === undefined) {
    const pkgPath = resolvePackageJsonPath();
    cached = JSON.parse(readFileSync(pkgPath, 'utf-8')).version as string;
  }
  return cached;
}
