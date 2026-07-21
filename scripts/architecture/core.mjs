import ts from 'typescript';

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

export function extractModuleSpecifiers(source, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }

    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function findWorkspaceTarget(specifier, workspaceNames) {
  return workspaceNames.find(
    (name) => specifier === name || specifier.startsWith(`${name}/`),
  );
}

export function validateArchitecture(projects, policy) {
  const errors = [];
  const workspaceNames = Object.keys(policy).sort(
    (left, right) => right.length - left.length,
  );

  for (const project of projects) {
    const projectPolicy = policy[project.name];
    if (projectPolicy === undefined) {
      errors.push(
        `${project.name}: project is missing from the architecture policy.`,
      );
      continue;
    }

    const allowedDependencies = new Set(projectPolicy.allowedDependencies);

    for (const field of DEPENDENCY_FIELDS) {
      for (const dependency of Object.keys(project.manifest[field] ?? {})) {
        if (
          workspaceNames.includes(dependency) &&
          !allowedDependencies.has(dependency)
        ) {
          errors.push(
            `${project.name}: ${field} contains forbidden workspace dependency ${dependency}.`,
          );
        }
      }
    }

    for (const source of project.sources) {
      for (const specifier of extractModuleSpecifiers(
        source.content,
        source.file,
      )) {
        if (!specifier.startsWith('@replay/')) {
          continue;
        }

        const target = findWorkspaceTarget(specifier, workspaceNames);
        if (target === undefined) {
          errors.push(
            `${project.name}:${source.file}: imports unknown workspace package ${specifier}.`,
          );
          continue;
        }

        if (specifier !== target) {
          errors.push(
            `${project.name}:${source.file}: deep import ${specifier} must use public entry ${target}.`,
          );
        }

        if (target !== project.name && !allowedDependencies.has(target)) {
          errors.push(
            `${project.name}:${source.file}: import of ${target} violates dependency direction.`,
          );
        }
      }
    }
  }

  return errors;
}
