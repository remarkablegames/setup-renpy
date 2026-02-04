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

const mockedExec: jest.MockedFunction<
  (commandLine: string, args?: string[]) => Promise<number>
> = jest.fn();

jest.unstable_mockModule('@actions/exec', () => ({
  exec: mockedExec,
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

const mockedWriteFile: jest.MockedFunction<
  (path: string, data: string) => Promise<void>
> = jest.fn();

jest.unstable_mockModule('node:os', () => ({
  platform: mockedPlatform,
  arch: mockedArch,
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  writeFile: mockedWriteFile,
}));

const mockedCreateLauncherBinary: jest.MockedFunction<
  (
    directory: string,
    name: string,
    cliPath: string,
    version: string,
  ) => Promise<void>
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
}));

jest.unstable_mockModule('node:path', () => ({
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

const cliName = 'cli-name';
const version = '1.2.3';
const launcherName = 'launcher-name';
const pathToTarball = 'path/to/tarball';
const pathToCLI = 'path/to/cli';

describe.each([
  ['linux', 'arm64'],
  ['win32', 'x64'],
])('when platform is %p and arch is %p', (platform, arch) => {
  beforeEach(() => {
    mockedPlatform.mockReturnValue(platform as NodeJS.Platform);
    mockedArch.mockReturnValue(arch as NodeJS.Architecture);

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

    expect(mockedExec).toHaveBeenCalledWith('mv', [
      `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}/renpy.sh`,
      `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}/cli-name`,
    ]);

    const sdkDirectory = `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}`;

    expect(mockedCreateLauncherBinary).toHaveBeenCalledWith(
      sdkDirectory,
      launcherName,
      `${pathToCLI}/renpy-${version}-sdk${arch === 'arm64' ? 'arm' : ''}/cli-name`,
      version,
    );

    expect(mockedExec).toHaveBeenCalledWith('rm', [
      '-rf',
      `${sdkDirectory}/doc`,
      `${sdkDirectory}/gui`,
      `${sdkDirectory}/LICENSE.txt`,
      `${sdkDirectory}/sdk-fonts`,
      `${sdkDirectory}/the_question`,
      `${sdkDirectory}/update`,
    ]);

    expect(mockedTcCacheDir).toHaveBeenCalledWith(
      sdkDirectory,
      cliName,
      version,
    );

    expect(mockedCoreAddPath).toHaveBeenCalledWith(sdkDirectory);

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
