import assert from 'node:assert/strict';
import test from 'node:test';

import { extractModuleSpecifiers, validateArchitecture } from './core.mjs';
import { architecturePolicy } from './policy.mjs';

function project(name, dependencies = {}, source = 'export {};') {
  return {
    name,
    manifest: { dependencies },
    sources: [{ file: 'src/index.ts', content: source }],
  };
}

test('extracts static, dynamic, re-export, and type import specifiers', () => {
  assert.deepEqual(
    extractModuleSpecifiers(`
      import '@replay/domain';
      export { value } from '@replay/application';
      const lazy = import('@replay/collector');
      type Value = import('@replay/storage').Value;
    `),
    [
      '@replay/domain',
      '@replay/application',
      '@replay/collector',
      '@replay/storage',
    ],
  );
});

test('rejects a forbidden adapter-to-adapter dependency and import', () => {
  const errors = validateArchitecture(
    [
      project(
        '@replay/collector',
        { '@replay/storage': 'workspace:*' },
        "export { value } from '@replay/storage';",
      ),
    ],
    architecturePolicy,
  );

  assert.deepEqual(errors, [
    '@replay/collector: dependencies contains forbidden workspace dependency @replay/storage.',
    '@replay/collector:src/index.ts: import of @replay/storage violates dependency direction.',
  ]);
});

test('rejects cross-package deep imports', () => {
  const errors = validateArchitecture(
    [
      project(
        '@replay/application',
        { '@replay/domain': 'workspace:*' },
        "export { value } from '@replay/domain/internal/value.js';",
      ),
    ],
    architecturePolicy,
  );

  assert.deepEqual(errors, [
    '@replay/application:src/index.ts: deep import @replay/domain/internal/value.js must use public entry @replay/domain.',
  ]);
});

test('permits the desktop composition root to depend on every package', () => {
  const allowed = architecturePolicy['@replay/desktop'].allowedDependencies;
  const dependencies = Object.fromEntries(
    allowed.map((name) => [name, 'workspace:*']),
  );
  const source = allowed.map((name) => `export * from '${name}';`).join('\n');

  assert.deepEqual(
    validateArchitecture(
      [project('@replay/desktop', dependencies, source)],
      architecturePolicy,
    ),
    [],
  );
});

test('permits inward dependencies through public package entries', () => {
  assert.deepEqual(
    validateArchitecture(
      [
        project(
          '@replay/application',
          { '@replay/domain': 'workspace:*' },
          "export type { Value } from '@replay/domain';",
        ),
      ],
      architecturePolicy,
    ),
    [],
  );
});

test('rejects a discovered workspace project missing from policy', () => {
  assert.deepEqual(
    validateArchitecture([project('@replay/unknown')], architecturePolicy),
    ['@replay/unknown: project is missing from the architecture policy.'],
  );
});
