import { jest } from '@jest/globals';

const mockedCoreGetInput: jest.MockedFunction<(name: string) => string> =
  jest.fn();
const mockedCoreSetFailed: jest.MockedFunction<(message: string) => void> =
  jest.fn();
const mockedCoreAddPath: jest.MockedFunction<(inputPath: string) => void> =
  jest.fn();
const mockedCoreSetOutput: jest.MockedFunction<
  (name: string, value: string) => void
> = jest.fn();

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockedCoreGetInput,
  setFailed: mockedCoreSetFailed,
  addPath: mockedCoreAddPath,
  setOutput: mockedCoreSetOutput,
}));

const mockedTcDownloadTool: jest.MockedFunction<
  (url: string) => Promise<string>
> = jest.fn();

const mockedTcExtractTar: jest.MockedFunction<
  (file: string, dest?: string) => Promise<string>
> = jest.fn();

const mockedTcExtractZip: jest.MockedFunction<
  (file: string, dest?: string) => Promise<string>
> = jest.fn();

const mockedTcCacheDir: jest.MockedFunction<
  (sourceDir: string, tool: string, version: string) => Promise<string>
> = jest.fn();

const mockedTcFind: jest.MockedFunction<
  (toolName: string, versionSpec: string) => string
> = jest.fn();

jest.unstable_mockModule('@actions/tool-cache', () => ({
  downloadTool: mockedTcDownloadTool,
  extractTar: mockedTcExtractTar,
  extractZip: mockedTcExtractZip,
  cacheDir: mockedTcCacheDir,
  find: mockedTcFind,
}));

const mockedPlatform: jest.MockedFunction<() => NodeJS.Platform> = jest.fn();
const mockedArch: jest.MockedFunction<() => NodeJS.Architecture> = jest.fn();
const mockedTmpdir: jest.MockedFunction<() => string> = jest.fn();

const mockedWriteFile: jest.MockedFunction<
  (path: string, data: string) => Promise<void>
> = jest.fn();
const mockedMkdtemp: jest.MockedFunction<(prefix: string) => Promise<string>> =
  jest.fn();
const mockedRm: jest.MockedFunction<
  (
    path: string,
    options?: {
      force?: boolean;
      recursive?: boolean;
    },
  ) => Promise<void>
> = jest.fn();

jest.unstable_mockModule('node:os', () => ({
  platform: mockedPlatform,
  arch: mockedArch,
  tmpdir: mockedTmpdir,
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  writeFile: mockedWriteFile,
  mkdtemp: mockedMkdtemp,
  rm: mockedRm,
}));

const mockedCreateLauncherBinary: jest.MockedFunction<
  (
    directory: string,
    wrapperDirectory: string,
    name: string,
    cliPath: string,
    version: string,
  ) => Promise<void>
> = jest.fn();
const mockedCreateUnixBinaryWrapper: jest.MockedFunction<
  (directory: string, name: string, command: string) => Promise<void>
> = jest.fn();
const mockedCreateWindowsBinaryWrapper: jest.MockedFunction<
  (directory: string, name: string, command: string) => Promise<void>
> = jest.fn();

// Create mocked versions of utils functions that use the mocked os module
const mockedGetDownloadObject = (version: string) => {
  const isArm = mockedArch().includes('arm');
  return {
    sdk: `https://www.renpy.org/dl/${version}/renpy-${version}-sdk${isArm ? 'arm.tar.bz2' : '.zip'}`,
    rapt: `https://www.renpy.org/dl/${version}/renpy-${version}-rapt.zip`,
    renios: `https://www.renpy.org/dl/${version}/renpy-${version}-renios.zip`,
    web: `https://www.renpy.org/dl/${version}/renpy-${version}-web.zip`,
  };
};

const mockedGetBinaryDirectory = (directory: string, version: string) => {
  return `${directory}/renpy-${version}-sdk${mockedArch().includes('arm') ? 'arm' : ''}`;
};

const mockedGetBinaryPath = (directory: string, name: string) => {
  return `${directory}/${name}.sh`;
};

const mockedGetLauncherDirectory = (directory: string) => {
  return `${directory}/launcher`;
};

jest.unstable_mockModule('./utils.js', () => ({
  getDownloadObject: mockedGetDownloadObject,
  getBinaryDirectory: mockedGetBinaryDirectory,
  getBinaryPath: mockedGetBinaryPath,
  getLauncherDirectory: mockedGetLauncherDirectory,
  createLauncherBinary: mockedCreateLauncherBinary,
  createUnixBinaryWrapper: mockedCreateUnixBinaryWrapper,
  createWindowsBinaryWrapper: mockedCreateWindowsBinaryWrapper,
}));

jest.unstable_mockModule('node:path', () => ({
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

const cliName = 'cli-name';
const version = '1.2.3';
const launcherName = 'launcher-name';
const pathToTarball = 'path/to/tarball';
const pathToCLI = 'path/to/cli';
const pathToTemp = 'path/to/temp';
const pathToRunnerTemp = 'path/to/runner-temp';

beforeEach(() => {
  jest.clearAllMocks();
});

describe.each([
  ['linux', 'arm64'],
  ['win32', 'x64'],
])('when platform is %p and arch is %p', (platform, arch) => {
  beforeEach(() => {
    mockedPlatform.mockReturnValue(platform as NodeJS.Platform);
    mockedArch.mockReturnValue(arch as NodeJS.Architecture);
    mockedTmpdir.mockReturnValue(pathToTemp);
    mockedMkdtemp.mockResolvedValue(`${pathToRunnerTemp}/setup-renpy-123`);
    process.env['RUNNER_TEMP'] = pathToRunnerTemp;

    mockedCoreGetInput.mockImplementation((input) => {
      switch (input) {
        case 'cli-version':
          return version;
        case 'cli-name':
          return cliName;
        case 'launcher-name':
          return launcherName;
        case 'rapt':
          return 'false';
        case 'renios':
          return 'false';
        case 'web':
          return 'false';
        default:
          throw Error(`Invalid input: ${input}`);
      }
    });
  });

  it('downloads, extracts, and adds SDK to PATH', async () => {
    const { run } = await import('./index.js');
    mockedTcDownloadTool.mockResolvedValueOnce(pathToTarball);
    const extract =
      platform === 'win32' ? mockedTcExtractZip : mockedTcExtractTar;
    extract.mockResolvedValueOnce(pathToCLI);

    await run();

    expect(mockedTcDownloadTool).toHaveBeenCalledWith(
      arch === 'arm64'
        ? `https://www.renpy.org/dl/${version}/renpy-${version}-sdkarm.tar.bz2`
        : `https://www.renpy.org/dl/${version}/renpy-${version}-sdk.zip`,
    );

    expect(extract).toHaveBeenCalledWith(pathToTarball);

    const sdkDirectory = `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}`;
    const wrapperDirectory = `${pathToRunnerTemp}/setup-renpy-123`;

    if (platform === 'win32') {
      expect(mockedMkdtemp).toHaveBeenCalledWith(
        `${pathToRunnerTemp}/setup-renpy-`,
      );
      expect(mockedCreateUnixBinaryWrapper).not.toHaveBeenCalled();
      expect(mockedCreateWindowsBinaryWrapper).toHaveBeenCalledWith(
        wrapperDirectory,
        cliName,
        `"${sdkDirectory}/renpy.exe"`,
      );
    } else {
      expect(mockedMkdtemp).toHaveBeenCalledWith(
        `${pathToRunnerTemp}/setup-renpy-`,
      );
      expect(mockedCreateWindowsBinaryWrapper).not.toHaveBeenCalled();
      expect(mockedCreateUnixBinaryWrapper).toHaveBeenCalledWith(
        wrapperDirectory,
        cliName,
        `"${sdkDirectory}/renpy.sh"`,
      );
    }

    expect(mockedCreateLauncherBinary).toHaveBeenCalledWith(
      sdkDirectory,
      wrapperDirectory,
      launcherName,
      `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}/renpy.sh`,
      version,
    );

    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/doc`, {
      force: true,
      recursive: true,
    });
    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/gui`, {
      force: true,
      recursive: true,
    });
    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/LICENSE.txt`, {
      force: true,
      recursive: true,
    });
    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/sdk-fonts`, {
      force: true,
      recursive: true,
    });
    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/the_question`, {
      force: true,
      recursive: true,
    });
    expect(mockedRm).toHaveBeenCalledWith(`${sdkDirectory}/update`, {
      force: true,
      recursive: true,
    });

    expect(mockedTcCacheDir).toHaveBeenCalledWith(
      sdkDirectory,
      cliName,
      version,
    );

    expect(mockedCoreAddPath).toHaveBeenCalledWith(wrapperDirectory);

    expect(mockedCoreSetOutput).toHaveBeenCalledWith(
      'launcher',
      `${sdkDirectory}/launcher`,
    );
  });
});

describe.each([
  { rapt: true, renios: false, web: false },
  { rapt: false, renios: true, web: false },
  { rapt: false, renios: false, web: true },
])('when input is %p and arch is %p', (inputs) => {
  beforeEach(() => {
    mockedPlatform.mockReturnValue('darwin');
    mockedArch.mockReturnValue('x64');
    mockedTmpdir.mockReturnValue(pathToTemp);
    mockedMkdtemp.mockResolvedValue(`${pathToRunnerTemp}/setup-renpy-123`);
    process.env['RUNNER_TEMP'] = pathToRunnerTemp;

    mockedCoreGetInput.mockImplementation((input) => {
      switch (input) {
        case 'cli-version':
          return version;
        case 'cli-name':
          return cliName;
        case 'launcher-name':
          return launcherName;
        case 'rapt':
          return String(inputs.rapt);
        case 'renios':
          return String(inputs.renios);
        case 'web':
          return String(inputs.web);
        default:
          throw Error(`Invalid input: ${input}`);
      }
    });
  });

  it('downloads, extracts, and adds SDK to PATH', async () => {
    const { run } = await import('./index.js');
    mockedTcDownloadTool.mockResolvedValue(pathToTarball);
    mockedTcExtractZip.mockResolvedValue(pathToCLI);

    await run();

    expect(mockedCreateUnixBinaryWrapper).toHaveBeenCalledWith(
      `${pathToRunnerTemp}/setup-renpy-123`,
      cliName,
      `"${pathToCLI}/renpy-${version}-sdk/renpy.sh"`,
    );
    expect(mockedCreateWindowsBinaryWrapper).not.toHaveBeenCalled();

    Object.entries(inputs).forEach(([key, value]) => {
      if (value) {
        expect(mockedTcDownloadTool).toHaveBeenCalledWith(
          `https://www.renpy.org/dl/${version}/renpy-${version}-${key}.zip`,
        );

        expect(mockedTcExtractZip).toHaveBeenCalledWith(
          pathToTarball,
          `${pathToCLI}/renpy-${version}-sdk`,
        );
      }
    });
  });
});

describe('error', () => {
  it('throws error', async () => {
    const message = 'error';
    const { run } = await import('./index.js');
    mockedCoreGetInput.mockImplementationOnce(() => {
      throw new Error(message);
    });
    await run();
    expect(mockedCoreSetFailed).toHaveBeenCalledWith(message);
  });
});

describe('temporary directory fallback', () => {
  beforeEach(() => {
    mockedPlatform.mockReturnValue('linux');
    mockedArch.mockReturnValue('x64');
    mockedTmpdir.mockReturnValue(pathToTemp);
    mockedMkdtemp.mockResolvedValue(`${pathToTemp}/setup-renpy-123`);
    delete process.env['RUNNER_TEMP'];

    mockedCoreGetInput.mockImplementation((input) => {
      switch (input) {
        case 'cli-version':
          return version;
        case 'cli-name':
          return cliName;
        case 'launcher-name':
          return launcherName;
        case 'rapt':
        case 'renios':
        case 'web':
          return 'false';
        default:
          throw Error(`Invalid input: ${input}`);
      }
    });
  });

  it('uses os tmpdir when RUNNER_TEMP is unavailable', async () => {
    const { run } = await import('./index.js');
    mockedTcDownloadTool.mockResolvedValueOnce(pathToTarball);
    mockedTcExtractTar.mockResolvedValueOnce(pathToCLI);

    await run();

    expect(mockedMkdtemp).toHaveBeenCalledWith(`${pathToTemp}/setup-renpy-`);
  });
});
