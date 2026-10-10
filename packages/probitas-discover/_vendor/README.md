# Vendored modules

Copies of [Deno std](https://github.com/denoland/std) modules (MIT, see the
`LICENSE` in each directory). They are vendored because std is published only
on JSR, and depending on it through the `@jsr` npm mirror would make this
package uninstallable from npm without extra registry configuration. Keeping
std's `globToRegExp` (rather than another glob library) also keeps the meaning
of users' `includes` / `excludes` patterns unchanged.

| Directory      | Source                                       | Version |
| -------------- | -------------------------------------------- | ------- |
| `std_path`     | [`@std/path`](https://jsr.io/@std/path)         | 1.1.6   |
| `std_internal` | [`@std/internal`](https://jsr.io/@std/internal) | 1.0.14  |

Only the modules reachable from `@std/path/glob-to-regexp` are copied; import
specifiers are rewritten to relative paths and nothing else is changed. Do not
edit these files by hand. To update, install the new versions as dev
dependencies and run from the repository root:

```sh
rm -rf packages/probitas-discover/_vendor/std_*
bun scripts/vendor_jsr.ts . packages/probitas-discover/_vendor @std/path/glob-to-regexp
```

then copy each package's `LICENSE` into its directory and update the table.
