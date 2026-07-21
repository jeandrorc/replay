import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  collectFiles,
  readDocuments,
  validateActiveWork,
  validateMarkdownLinks,
  validateRequiredDocuments,
} from './core.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');
const config = JSON.parse(
  await readFile(path.join(scriptDirectory, 'config.json'), 'utf8'),
);

const markdownFiles = await collectFiles(repositoryRoot, (file) =>
  file.endsWith('.md'),
);
const backlogFiles = markdownFiles.filter((file) =>
  file.includes(`${path.sep}docs${path.sep}backlog${path.sep}`),
);
const planFiles = markdownFiles.filter((file) =>
  file.includes(`${path.sep}docs${path.sep}exec-plans${path.sep}`),
);

const markdownDocuments = await readDocuments(markdownFiles);
const backlogDocuments = await readDocuments(backlogFiles);
const planDocuments = await readDocuments(planFiles);
const errors = [
  ...(await validateRequiredDocuments(
    repositoryRoot,
    config.requiredDocuments,
  )),
  ...validateActiveWork(backlogDocuments, planDocuments),
  ...(await validateMarkdownLinks(markdownDocuments)),
];

if (errors.length > 0) {
  console.error(
    ['Harness validation failed:', ...errors.map((error) => `- ${error}`)].join(
      '\n',
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    `Harness validation passed: ${markdownFiles.length} Markdown files, one active story, one matching plan.`,
  );
}
