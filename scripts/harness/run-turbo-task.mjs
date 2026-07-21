import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateTurboTaskOutput } from './core.mjs';

const task = process.argv[2];
if (task === undefined) {
  console.error('Usage: node scripts/harness/run-turbo-task.mjs <task>');
  process.exit(2);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  await readFile(path.join(scriptDirectory, 'config.json'), 'utf8'),
);
const child = spawn('pnpm', ['exec', 'turbo', 'run', task], {
  cwd: path.resolve(scriptDirectory, '../..'),
  env: { ...process.env, FORCE_COLOR: '0' },
  stdio: ['inherit', 'pipe', 'pipe'],
});
let output = '';

for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    const destination =
      stream === child.stdout ? process.stdout : process.stderr;
    destination.write(chunk);
  });
}

child.on('error', (error) => {
  console.error(`Unable to run Turbo task "${task}": ${error.message}`);
  process.exitCode = 1;
});

child.on('close', (code) => {
  if (code !== 0) {
    process.exitCode = code ?? 1;
    return;
  }

  const errors = validateTurboTaskOutput(
    task,
    output,
    config.requiredTurboTasks,
  );
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
});
