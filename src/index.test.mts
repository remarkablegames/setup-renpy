import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';

import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';

import * as utils from './utils.js';

const { mockedArch, mockedPlatform } = vi.hoisted(() => ({
  mockedArch: vi.fn(),
  mockedPlatform: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  addPath: vi.fn(),
  setOutput: vi.fn(),
}));

vi.mock('@actions/tool-cache', () => ({
  downloadTool: vi.fn(),
  extractTar: vi.fn(),
  extractZip: vi.fn(),
  cacheDir: vi.fn(),
  find: vi.fn(),
}));

vi.mock('node:os', () => ({
  platform: mockedPlatform,
  arch: mockedArch,
  tmpdir: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  mkdtemp: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('./utils.js', () => ({
  getDownloadObject: (version: string) => {
    const isArm = mockedArch().includes('arm');
    return {
      sdk: `https://www.renpy.org/dl/${version}/renpy-${version}-sdk${isArm ? 'arm.tar.bz2' : '.zip'}`,
      rapt: `https://www.renpy.org/dl/${version}/renpy-${version}-rapt.zip`,
      renios: `https://www.renpy.org/dl/${version}/renpy-${version}-renios.zip`,
      web: `https://www.renpy.org/dl/${version}/renpy-${version}-web.zip`,
    };
  },
  getBinaryDirectory: (directory: string, version: string) =>
    `${directory}/renpy-${version}-sdk${mockedArch().includes('arm') ? 'arm' : ''}`,
  getBinaryPath: (directory: string, name: string) => `${directory}/${name}.sh`,
  getLauncherDirectory: (directory: string) => `${directory}/launcher`,
  createLauncherBinary: vi.fn(),
  createUnixBinaryWrapper: vi.fn(),
  createWindowsBinaryWrapper: vi.fn(),
}));

vi.mock('node:path', () => ({
  resolve: vi.fn((...args: string[]) => args.join('/')),
}));

const mockedCoreGetInput = vi.mocked(core.getInput);
const mockedCoreSetFailed = vi.mocked(core.setFailed);
const mockedCoreAddPath = vi.mocked(core.addPath);
const mockedCoreSetOutput = vi.mocked(core.setOutput);
const mockedTcDownloadTool = vi.mocked(toolCache.downloadTool);
const mockedTcExtractTar = vi.mocked(toolCache.extractTar);
const mockedTcExtractZip = vi.mocked(toolCache.extractZip);
const mockedTcCacheDir = vi.mocked(toolCache.cacheDir);
const mockedTmpdir = vi.mocked(os.tmpdir);
const mockedMkdtemp = vi.mocked(fsPromises.mkdtemp);
const mockedRm = vi.mocked(fsPromises.rm);
const mockedCreateLauncherBinary = vi.mocked(utils.createLauncherBinary);
const mockedCreateUnixBinaryWrapper = vi.mocked(utils.createUnixBinaryWrapper);
const mockedCreateWindowsBinaryWrapper = vi.mocked(
  utils.createWindowsBinaryWrapper,
);

const cliName = 'cli-name';
const version = '1.2.3';
const launcherName = 'launcher-name';
const pathToTarball = 'path/to/tarball';
const pathToCLI = 'path/to/cli';
const pathToTemp = 'path/to/temp';
const pathToRunnerTemp = 'path/to/runner-temp';

beforeEach(() => {
  vi.clearAllMocks();
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
      expect(mockedCreateWindowsBinaryWrapper).toHaveBeenCalledWith(
        wrapperDirectory,
        'renpy',
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

describe('windows compatibility alias', () => {
  beforeEach(() => {
    mockedPlatform.mockReturnValue('win32');
    mockedArch.mockReturnValue('x64');
    mockedTmpdir.mockReturnValue(pathToTemp);
    mockedMkdtemp.mockResolvedValue(`${pathToRunnerTemp}/setup-renpy-123`);
    process.env['RUNNER_TEMP'] = pathToRunnerTemp;

    mockedCoreGetInput.mockImplementation((input) => {
      switch (input) {
        case 'cli-version':
          return version;
        case 'cli-name':
          return 'renpy';
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

  it('does not create a duplicate renpy alias when cli-name is renpy', async () => {
    const { run } = await import('./index.js');
    mockedTcDownloadTool.mockResolvedValueOnce(pathToTarball);
    mockedTcExtractZip.mockResolvedValueOnce(pathToCLI);

    await run();

    expect(mockedCreateWindowsBinaryWrapper).toHaveBeenCalledTimes(1);
    expect(mockedCreateWindowsBinaryWrapper).toHaveBeenCalledWith(
      `${pathToRunnerTemp}/setup-renpy-123`,
      'renpy',
      `"${pathToCLI}/renpy-${version}-sdk/renpy.exe"`,
    );
  });
});
