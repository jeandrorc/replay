import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateArchitecture } from './core.mjs';
import { architecturePolicy } from './policy.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');

async function discoverProjectRoots() {
  const projectRoots = [];

  for (const workspaceDirectory of ['apps', 'packages']) {
    const workspaceRoot = path.join(repositoryRoot, workspaceDirectory);
    const entries = await readdir(workspaceRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectRoot = path.join(workspaceRoot, entry.name);
        try {
          await access(path.join(projectRoot, 'package.json'));
          projectRoots.push(projectRoot);
        } catch {
          // Workspace containers without a manifest are not package projects.
        }
      }
    }
  }

  return projectRoots.sort();
}

async function collectSourceFiles(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)));
    } else if (/\.tsx?$/u.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

const projectRoots = await discoverProjectRoots();
const directoryErrors = [];
const projects = await Promise.all(
  projectRoots.map(async (projectRoot) => {
    const manifest = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8'),
    );
    const projectPolicy = architecturePolicy[manifest.name];
    const relativeProjectRoot = path.relative(repositoryRoot, projectRoot);

    if (
      projectPolicy !== undefined &&
      projectPolicy.directory !== relativeProjectRoot
    ) {
      directoryErrors.push(
        `${manifest.name}: policy directory ${projectPolicy.directory} does not match ${relativeProjectRoot}.`,
      );
    }

    const sourceFiles = await collectSourceFiles(path.join(projectRoot, 'src'));

    return {
      name: manifest.name,
      manifest,
      sources: await Promise.all(
        sourceFiles.map(async (file) => ({
          file: path.relative(projectRoot, file),
          content: await readFile(file, 'utf8'),
        })),
      ),
    };
  }),
);
const errors = [
  ...directoryErrors,
  ...validateArchitecture(projects, architecturePolicy),
];

if (errors.length > 0) {
  console.error(
    [
      'Architecture validation failed:',
      ...errors.map((error) => `- ${error}`),
    ].join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Architecture validation passed: ${projects.length} projects respect dependency and public-import boundaries.`,
  );
}
