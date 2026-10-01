import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
// Keep Expo's temporary public folder inside the project (required by SDK 57).
const temporaryPublic = await mkdtemp(join(root, '.expo-build-public-'));
try {
  for (const entry of await readdir(join(root, 'public'))) {
    if (entry !== 'exercise-library') {
      await cp(join(root, 'public', entry), join(temporaryPublic, entry), { recursive: true });
    }
  }
  const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'export', '--platform', 'web', ...process.argv.slice(2)], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_FOLDER: temporaryPublic },
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve(signal ? 1 : code));
  });
  process.exitCode = code ?? 1;
} finally {
  // This exact folder was created by mkdtemp above; never move/delete public/.
  await rm(temporaryPublic, { recursive: true, force: true });
}
