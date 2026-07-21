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
