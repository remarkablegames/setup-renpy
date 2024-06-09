# setup-renpy

[![version](https://badgen.net/github/release/remarkablegames/setup-renpy)](https://github.com/remarkablegames/setup-renpy/releases)
[![build](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml)

⚙️ GitHub Actions setup CLI template. Inspired by [github-developer/example-setup-gh](https://github.com/github-developer/example-setup-gh). Template from [remarkablemark/github-actions-typescript-template](https://github.com/remarkablemark/github-actions-typescript-template).

## Quick Start

```yaml
name: setup-renpy
on: push
jobs:
  setup-renpy:
    runs-on: ubuntu-latest
    steps:
      - name: Setup setup-renpy
        uses: remarkablegames/setup-renpy@v1
```

## Usage

See [action.yml](action.yml)

**Basic:**

```yaml
- uses: remarkablegames/setup-renpy@v1
```

## Inputs

### `cli-version`

**Optional**: The CLI [version](https://github.com/cli/cli/releases). Defaults to [`2.49.0`](https://github.com/cli/cli/releases/tag/v2.49.0):

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-version: 2.49.0
```

### `cli-name`

**Optional**: The htmlq CLI name. Defaults to `gh`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-name: gh
```

## Contributions

Contributions are welcome!

## License

[MIT](LICENSE)
