# Repository Rules

Project-specific rules for the Probitas Packages monorepo.

## Pre-Completion Verification

BEFORE reporting task completion, run and ensure zero errors/warnings:

```bash
bun run verify
```

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Release versions are derived from them (see [Releases](#releases)), so the type
matters:

| Commit                                                        | Release level | Example                                             |
| ------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| `feat:`                                                       | minor         | `feat(@probitas/builder): add retry option`         |
| `fix:`, `perf:`, `docs:`, `refactor:`, `test:`, `chore:`, ... | patch         | `fix(@probitas/runner): handle timeout errors`      |
| `!` suffix, `BREAKING CHANGE:` footer, or `BREAKING(...)`     | major         | `feat(@probitas/runner)!: change API signature`     |
| Any type with a `/unstable` scope                             | patch         | `feat(@probitas/runner/unstable): experimental API` |

While a package is 0.x, major and minor both bump its minor version.

### Scope Convention

Use full package name with `@probitas/` prefix as scope (e.g.,
`@probitas/expect`, `@probitas/client-http`). **Scopes are required**.

```bash
# Single package
feat(@probitas/builder): add retry option to step execution
fix(@probitas/client-http): handle connection pooling correctly

# Multiple packages (comma-separated)
fix(@probitas/runner,@probitas/core): fix shared type definitions

# All packages (wildcard)
docs(*): update copyright headers

# Unstable API (always patch, even for BREAKING)
feat(@probitas/runner/unstable): experimental parallel execution
```

Scopes describe the change for readers; which packages a release bumps is
decided from the files a commit touches, not from its scope.

## Releases

Package versions are not kept in the repository: `package.json` versions are
placeholders, and versions are decided when releasing.

- **Release**: publish a GitHub Release with a calendar tag such as
  `v20261008.01`. `publish.yml` runs `scripts/release_plan.ts`, which releases
  every package with commits touching `packages/<name>/` (tests excluded) since
  the previous release, at the level the commits call for, plus a patch for
  every package depending on a released one. Versions start from the latest
  stable version on npm. The plan is attached to the Release as `versions.json`
  (re-runs reuse it) and summarized in the release notes; the packages go to npm
  (`latest`) and JSR.
- **Dry run**: a GitHub Release marked as a pre-release only computes and
  attaches the plan. Pre-releases never become the "latest" release.
- **Prerelease**: running `publish.yml` manually publishes the planned versions
  as `<version>-next.<run>` under npm's `next` dist-tag (not to JSR).

`publish.yml` is the only workflow that publishes, because npm trusted
publishing ties each package to one workflow file. It authenticates to npm
through trusted publishing and to JSR through GitHub OIDC (no tokens), so a new
package must be published to npm once by hand and given `publish.yml` as its
trusted publisher first.
