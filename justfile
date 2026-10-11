# Run `nix develop` (or use direnv) first so every tool is on PATH.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List the recipes.
default:
    @just --list

# Install the dependencies exactly as bun.lock records them.
install:
    bun install --frozen-lockfile

# Format every source.
fmt:
    bun run fmt
    nixfmt $(git ls-files '*.nix')

# Check formatting without changing files.
fmt-check:
    bun run fmt:check
    nixfmt --check $(git ls-files '*.nix')

# Lint with Biome.
lint:
    bun run lint

# Type check with tsc.
typecheck:
    bun run check

# Check that the JSR manifests (deno.json) match package.json.
jsr-check:
    bun scripts/sync_jsr.ts --check

# Regenerate the JSR manifests (deno.json) from package.json.
jsr-sync:
    bun run jsr:sync

# Run the tests. Integration tests skip unless `docker compose up -d` is running.
[positional-arguments]
test *args:
    bun run test "$@"

# Run the tests and write an lcov report to .coverage/.
coverage:
    bun run test --coverage --coverage-reporter=lcov --coverage-dir=.coverage

# Build the packages for npm.
build:
    bun run build

# Everything CI checks.
ci: install fmt-check lint typecheck jsr-check test build
