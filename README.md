# setup-renpy

[![version](https://badgen.net/github/release/remarkablegames/setup-renpy)](https://github.com/remarkablegames/setup-renpy/releases)
[![build](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/remarkablegames/setup-renpy/graph/badge.svg?token=xTSeP1FvRP)](https://codecov.io/gh/remarkablegames/setup-renpy)

📖 Set up GitHub Actions workflow with [Ren'Py CLI](https://www.renpy.org/doc/html/cli.html).

## Quick Start

```yaml
name: Ren'Py CLI
on: push
jobs:
  renpy-cli:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Ren'Py
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

**Optional**: The CLI [version](https://www.renpy.org/release_list.html). Defaults to [`8.2.1`](https://www.renpy.org/latest.html):

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-version: 8.2.1
```

### `cli-name`

**Optional**: The CLI name. Defaults to `renpy-cli`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-name: renpy-cli
```

> [!NOTE]
> The CLI name cannot be `renpy` due to the SDK directory structure.

### `rapt`

**Optional**: Android Support (RAPT). Defaults to `false`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    rapt: false
```

### `renios`

**Optional**: iOS Support (Renios). Defaults to `false`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    renios: false
```

### `web`

**Optional**: Web Platform Support (Renpyweb). Defaults to `false`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    web: false
```

## Outputs

### `launcher`

[Ren'Py launcher](https://www.renpy.org/doc/html/cli.html#launcher-commands) path:

```yaml
- uses: remarkablegames/setup-renpy@v1
  id: renpy

- run: renpy-cli ${{ steps.renpy.outputs.launcher }} set_project .
```

## Contributions

Contributions are welcome!

## License

[MIT](LICENSE)
