# setup-renpy

[![version](https://badgen.net/github/release/remarkablegames/setup-renpy)](https://github.com/remarkablegames/setup-renpy/releases)
[![build](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablegames/setup-renpy/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/remarkablegames/setup-renpy/graph/badge.svg?token=xTSeP1FvRP)](https://codecov.io/gh/remarkablegames/setup-renpy)

📖 Set up GitHub Actions workflow with [Ren'Py CLI](https://www.renpy.org/doc/html/cli.html). Read the [blog post](https://remarkablegames.org/posts/setup-renpy-cli-github-actions/).

## Quick Start

```yaml
name: Ren'Py CLI
on: push
jobs:
  renpy:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Ren'Py
        uses: remarkablegames/setup-renpy@v1

      - name: Get version
        run: renpy-cli --version

      - name: See help
        run: renpy-cli --help

      - name: Set projects directory
        run: renpy-launcher set_projects_directory ..
```

## Usage

See [action.yml](action.yml)

**Basic:**

```yaml
- uses: remarkablegames/setup-renpy@v1
```

## Inputs

### `cli-name`

**Optional**: CLI name. Defaults to `renpy-cli`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-name: renpy-cli

- run: renpy-cli
```

> [!WARNING]
> On Linux and macOS, CLI name cannot be `renpy`.

> [!NOTE]
> On Windows, CLI name is `renpy` and it cannot be changed:
>
> ```yaml
> - uses: remarkablegames/setup-renpy@v1
>
> - run: renpy
> ```

### `cli-version`

**Optional**: CLI [version](https://www.renpy.org/release_list.html). Defaults to [`8.3.6`](https://www.renpy.org/release/8.3.6):

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    cli-version: 8.3.6

- run: renpy-cli --version
```

### `launcher-name`

**Optional**: Launcher name. Defaults to `renpy-launcher`:

```yaml
- uses: remarkablegames/setup-renpy@v1
  with:
    launcher-name: renpy-launcher

- run: renpy-launcher
```

> [!IMPORTANT]
> On Windows, `renpy-launcher` is unavailable.

`renpy-launcher` is a shorthand for:

```yaml
- uses: remarkablegames/setup-renpy@v1
  id: renpy
  with:
    cli-name: renpy-cli

- run: renpy-cli ${{ steps.renpy.outputs.launcher }}
```

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

- run: renpy-cli ${{ steps.renpy.outputs.launcher }}
```

> [!TIP]
> Prefer `renpy-launcher` on Linux and macOS:
>
> ```yaml
> - uses: remarkablegames/setup-renpy@v1
>
> - run: renpy-launcher
> ```

## Examples

- [remarkablegames/renpy-template](https://github.com/remarkablegames/renpy-template)
- [remarkablegames/renpy-examples](https://github.com/remarkablegames/renpy-examples)

## License

[MIT](LICENSE)
