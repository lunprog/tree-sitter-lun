# tree-sitter-lun

Lun grammar for [tree-sitter].

[tree-sitter]: https://github.com/tree-sitter/tree-sitter

## Add lun to [Helix]

*Based on the [documentation of helix].*

- Add the following in `languages.toml`:
```toml
[[language]]
name = "lun"
scope = "source.lun"
file-types = ["lun"]
comment-tokens = "//"
block-comment-tokens = { start = "/*", end = "*/" }
indent = { tab-width = 4, unit = "    "}

[[grammar]]
name = "lun"
source = { git = "https://github.com/lunprog/tree-sitter-lun", rev = "HEAD" }
# NOTE: instead of using HEAD, you may want to use a commit as rev or a tag.
```

- Copy the `queries/highlights.scm` file to `runtime/queries/lun/highlights.scm`
- Run `hx --grammar fetch` and `hx --grammar build`, it will fetch and build
  every grammar there is listed in your helix config and so the Lun grammar
  as well.
- Restart any helix instance (that was open before doing all that) you want the
  Lun grammar to function

[Helix]: https://helix-editor.com
[documentation of helix]: https://docs.helix-editor.com/languages.html

## Versions

Version of this package follows the [semver] convention. Tho the version of this
package, `tree-sitter-lun` doesn't match the version of [Lun]. This tree sitter
parser will always represent the grammar of the latest [Lun] grammar.

[semver]: https://semver.org
[Lun]: https://github.com/lunprog/lun

## License

Licensed under the MIT license, [LICENSE](LICENSE) or
[http://opensource.org/licenses/MIT].

## Contribution

Feel free to contribute. *For the moment there is no documentation but it will
come.*

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be licensed as above, without any
additional terms or conditions.
