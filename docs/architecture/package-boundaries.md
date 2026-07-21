# Package boundary matrix

`Yes` means a direct workspace dependency is allowed, not required.

| From / to   | domain | application | collector | storage | timeline | exporter | ai  | desktop |
| ----------- | ------ | ----------- | --------- | ------- | -------- | -------- | --- | ------- |
| domain      | —      | No          | No        | No      | No       | No       | No  | No      |
| application | Yes    | —           | No        | No      | No       | No       | No  | No      |
| collector   | Yes    | Yes         | —         | No      | No       | No       | No  | No      |
| storage     | Yes    | Yes         | No        | —       | No       | No       | No  | No      |
| timeline    | Yes    | Yes         | No        | No      | —        | No       | No  | No      |
| exporter    | Yes    | Yes         | No        | No      | No       | —        | No  | No      |
| ai          | Yes    | Yes         | No        | No      | No       | No       | —   | No      |
| desktop     | Yes    | Yes         | Yes       | Yes     | Yes      | Yes      | Yes | —       |

Additional constraints:

- Cross-package access goes through each package's public `index.ts` exports.
- Adapters communicate through application ports, never by importing one
  another.
- Package names describe capabilities; folders named `shared` or `common` are
  prohibited.
- A type is owned by the layer that defines its meaning. Do not duplicate
  equivalent DTOs merely to satisfy a directory convention; map only at a real
  boundary.

## Automated enforcement

Run `pnpm architecture:check` to validate workspace dependency fields and
TypeScript module specifiers against this matrix. The executable policy is in
`scripts/architecture/policy.mjs`; changes to it must update this table and its
positive and negative tests in the same change.

The checker parses TypeScript syntax, rejects unknown `@replay/*` packages,
forbidden dependency direction, and package subpath imports. It reads only
repository manifests and `src` files and introduces no product dependency.
