# Vendored modules

Copies of [Deno std](https://github.com/denoland/std) modules (MIT, see the
`LICENSE` in each directory). They are vendored because std is published only
on JSR, and depending on it through the `@jsr` npm mirror would make this
package uninstallable from npm without extra registry configuration.

| Directory      | Source                                       | Version |
| -------------- | -------------------------------------------- | ------- |
| `std_expect`   | [`@std/expect`](https://jsr.io/@std/expect)     | 1.0.20  |
| `std_assert`   | [`@std/assert`](https://jsr.io/@std/assert)     | 1.0.19  |
| `std_internal` | [`@std/internal`](https://jsr.io/@std/internal) | 1.0.14  |
| `std_path`     | [`@std/path`](https://jsr.io/@std/path)         | 1.1.6   |

Only the modules reachable from `@std/expect` are copied; import specifiers
are rewritten to relative paths and nothing else is changed, except that
`std_expect/_snapshot_state.ts` is prefixed with `// @ts-nocheck`: it implements
`toMatchSnapshot()` on top of Deno APIs, which this package never calls, and
would otherwise fail type-checking without Deno's globals. Do not edit these
files by hand. To update, install the new versions as dev dependencies and run
from the repository root:

```sh
rm -rf packages/probitas-expect/_vendor/std_*
bun scripts/vendor_jsr.ts . packages/probitas-expect/_vendor @std/expect \
  --nocheck std_expect/_snapshot_state.ts
```

then copy each package's `LICENSE` into its directory and update the table.
