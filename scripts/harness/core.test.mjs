import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  extractLocalMarkdownTargets,
  validateActiveWork,
  validateMarkdownLinks,
  validateTurboTaskOutput,
} from './core.mjs';

test('accepts one active story with one matching active plan', () => {
  const errors = validateActiveWork(
    [{ content: '### [~] FND-004 — Harness' }],
    [
      {
        file: 'FND-004.md',
        content: '- Status: Active\n- Story: [FND-004](story.md)',
      },
    ],
  );

  assert.deepEqual(errors, []);
});

test('rejects multiple active stories', () => {
  const errors = validateActiveWork(
    [{ content: '### [~] FND-001 — First\n### [~] FND-004 — Second' }],
    [
      {
        file: 'FND-002.md',
        content: '- Status: Active\n- Story: [FND-002](story.md)',
      },
    ],
  );

  assert.deepEqual(errors, ['Expected exactly one active story, found 2.']);
});

test('rejects a plan that does not match the active story', () => {
  const errors = validateActiveWork(
    [{ content: '### [~] FND-004 — Harness' }],
    [
      {
        file: 'FND-002.md',
        content: '- Status: Active\n- Story: [FND-002](story.md)',
      },
    ],
  );

  assert.deepEqual(errors, [
    'Active story FND-004 does not match active plan FND-002.',
  ]);
});

test('rejects an active story without an active execution plan', () => {
  const errors = validateActiveWork(
    [{ content: '### [~] FND-004 — Harness' }],
    [],
  );

  assert.deepEqual(errors, [
    'Expected exactly one active execution plan, found 0.',
  ]);
});

test('extracts only local Markdown targets', () => {
  assert.deepEqual(
    extractLocalMarkdownTargets(
      '[local](../README.md) [anchor](#section) [web](https://example.com)',
    ),
    ['../README.md'],
  );
});

test('reports a missing local link without changing its source', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'replay-harness-'));
  const source = path.join(directory, 'source.md');
  const original = '[missing](missing.md)\n';
  await writeFile(source, original, 'utf8');

  const errors = await validateMarkdownLinks([
    { file: source, content: original },
  ]);

  assert.equal(errors.length, 1);
  assert.equal(await readFile(source, 'utf8'), original);
});

test('rejects zero Turbo tasks only when the task is required', () => {
  const output = 'No tasks were executed as part of this run.';

  assert.deepEqual(validateTurboTaskOutput('test', output, []), []);
  assert.deepEqual(validateTurboTaskOutput('test', output, ['test']), [
    'Turbo task "test" unexpectedly executed zero package tasks.',
  ]);
});
