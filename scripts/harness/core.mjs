import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ACTIVE_STORY_PATTERN = /^### \[~\] ([A-Z]+-\d+) — /gmu;
const ACTIVE_PLAN_STATUS_PATTERN = /^- Status: Active$/mu;
const PLAN_STORY_PATTERN = /^- Story: \[([A-Z]+-\d+)\]/mu;
const MARKDOWN_LINK_PATTERN = /\[[^\]]*\]\(([^)]+)\)/gu;

export async function collectFiles(root, predicate) {
  const collected = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (predicate(absolutePath)) {
        collected.push(absolutePath);
      }
    }
  }

  await visit(root);
  return collected;
}

export function findActiveStoryIds(backlogDocuments) {
  return backlogDocuments.flatMap(({ content }) =>
    [...content.matchAll(ACTIVE_STORY_PATTERN)].map((match) => match[1]),
  );
}

export function findActivePlans(planDocuments) {
  return planDocuments.flatMap(({ file, content }) => {
    if (!ACTIVE_PLAN_STATUS_PATTERN.test(content)) {
      return [];
    }

    const storyMatch = content.match(PLAN_STORY_PATTERN);
    return [{ file, storyId: storyMatch?.[1] }];
  });
}

export function validateActiveWork(backlogDocuments, planDocuments) {
  const storyIds = findActiveStoryIds(backlogDocuments);
  const activePlans = findActivePlans(planDocuments);
  const errors = [];

  if (storyIds.length !== 1) {
    errors.push(`Expected exactly one active story, found ${storyIds.length}.`);
  }

  if (activePlans.length !== 1) {
    errors.push(
      `Expected exactly one active execution plan, found ${activePlans.length}.`,
    );
  }

  if (activePlans.length === 1 && activePlans[0].storyId === undefined) {
    errors.push(
      `Active plan ${activePlans[0].file} does not declare a story ID.`,
    );
  }

  if (
    storyIds.length === 1 &&
    activePlans.length === 1 &&
    activePlans[0].storyId !== storyIds[0]
  ) {
    errors.push(
      `Active story ${storyIds[0]} does not match active plan ${activePlans[0].storyId}.`,
    );
  }

  return errors;
}

export function extractLocalMarkdownTargets(content) {
  return [...content.matchAll(MARKDOWN_LINK_PATTERN)]
    .map((match) => match[1].split('#')[0])
    .filter(
      (target) =>
        target.length > 0 &&
        !target.startsWith('#') &&
        !/^[a-z][a-z\d+.-]*:/iu.test(target),
    );
}

export async function validateMarkdownLinks(markdownDocuments) {
  const errors = [];

  for (const { file, content } of markdownDocuments) {
    for (const target of extractLocalMarkdownTargets(content)) {
      const decodedTarget = decodeURIComponent(target.replace(/^<|>$/gu, ''));
      const absoluteTarget = path.resolve(path.dirname(file), decodedTarget);

      try {
        await stat(absoluteTarget);
      } catch {
        errors.push(`${file}: missing local link target ${target}.`);
      }
    }
  }

  return errors;
}

export async function validateRequiredDocuments(root, requiredDocuments) {
  const errors = [];

  for (const document of requiredDocuments) {
    try {
      await stat(path.resolve(root, document));
    } catch {
      errors.push(`Missing required document: ${document}.`);
    }
  }

  return errors;
}

export function validateTurboTaskOutput(task, output, requiredTasks) {
  if (
    requiredTasks.includes(task) &&
    /No tasks were executed as part of this run\./u.test(output)
  ) {
    return [`Turbo task "${task}" unexpectedly executed zero package tasks.`];
  }

  return [];
}

export async function readDocuments(files) {
  return Promise.all(
    files.map(async (file) => ({
      file,
      content: await readFile(file, 'utf8'),
    })),
  );
}
