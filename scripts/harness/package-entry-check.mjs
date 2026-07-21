import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

test('built package exposes an importable public entry point', async () => {
  const packageRoot = process.cwd();
  const manifest = JSON.parse(
    await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  const entryPoint = path.resolve(packageRoot, manifest.exports['.'].import);
  const typeDeclarations = path.resolve(
    packageRoot,
    manifest.exports['.'].types,
  );

  await access(entryPoint);
  await access(typeDeclarations);

  const publicModule = await import(pathToFileURL(entryPoint));

  assert.equal(typeof publicModule, 'object');
});
