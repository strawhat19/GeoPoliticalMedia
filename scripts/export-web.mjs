import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, [`node_modules/expo/bin/cli`, `export`, `--platform`, `web`], {
  stdio: `inherit`,
  env: { ...process.env, EXPO_PUBLIC_FOLDER: `web` },
});
process.exit(result.status ?? 1);
