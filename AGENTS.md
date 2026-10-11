# Probitas Packages

Monorepo containing core framework packages and client libraries for the
Probitas scenario-based testing framework.

- **Runtime**: Bun 1.4+ (pinned in `flake.nix`)
- **Registries**: npm (`@probitas-test/*`) and JSR (`@probitas/*`)
- **Framework packages**: builder, runner, reporter, core, discover, expect, and
  the other non-client packages
- **Client packages**: `@probitas-test/client-*` (HTTP, gRPC, SQL, Redis,
  MongoDB, and the other protocols)

`@probitas-test/probitas` (the user-facing entry point and CLI) is maintained
separately in [probitas](https://github.com/probitas-test/probitas).

## How it is built

- **Test first.** Red → green → refactor. Write the failing test before the code
  that makes it pass.
- **Each layer holds one thing.** Put a fact in the one layer that owns it, and
  nowhere else.

  | Layer        | Holds                                                              |
  | ------------ | ------------------------------------------------------------------ |
  | `docs/adr/`  | one decision and why it was made                                   |
  | `docs/spec/` | the behaviour users and other components can rely on               |
  | Tests        | the details that pin the behaviour down: rules, boundaries, tables |
  | Code         | how it is done                                                     |
  | Commits      | why a change was made                                              |
  | Comments     | why it is not done another way                                     |

  Before writing, fixing or reviewing a record, read `docs/adr/README.md`;
  before writing, fixing or reviewing a spec, read `docs/spec/README.md`. Follow
  their writing order.
- **Dependencies are current.** Before adding or bumping one, look up its latest
  release in the registry. Do not copy a version from memory or from another
  repository. Client packages may depend only on what
  [`.claude/rules/dependencies/client-packages.md`](.claude/rules/dependencies/client-packages.md)
  allows.

The coding rules live in `.claude/rules/` (design, development, TypeScript,
logging, package structure); each applies to the paths named in its header.

## Quality gate

Run `just ci` before reporting a change as done. CI runs the same recipe.

Integration tests skip when their service is not reachable. Start the services
with `docker compose up -d` (`compose.yaml`) to run them locally; CI runs them
in the `test` job against service containers. When adding an integration test,
add its service to both `compose.yaml` and `.github/workflows/test.yml`.

When touching `package.json` exports or dependencies, run `just jsr-sync` so the
`deno.json` files stay in step (`just ci` checks them).

## Layout

| Path                 | What lives there                                               |
| -------------------- | -------------------------------------------------------------- |
| `packages/`          | the published packages, one directory per package              |
| `internal/`          | private workspace packages (the `bun:test` adapter)            |
| `scripts/`           | build, pack, JSR sync and release scripts                      |
| `docs/`              | ADRs and specs                                                 |
| `.github/workflows/` | `test.yml` (quality gate and integration tests), `publish.yml` |

## Language

- README, docs and commit messages: English
- Code comments, log and error messages: English

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) with a required
scope: the package name without its registry scope (`feat(runner): …`,
`fix(client-http): …`), several joined with `,` (`fix(runner,core): …`), and
`(*)` for repository-wide changes. Release versions are derived from the commit
types, so the type matters: `feat` is minor, `!` or `BREAKING CHANGE:` is major,
everything else is patch, and a `/unstable` scope is always patch.

[`.claude/rules/repository.md`](.claude/rules/repository.md) has the full
convention and how releases are made.
