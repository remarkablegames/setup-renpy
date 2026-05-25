import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/exec', () => ({
  exec: jest.fn(),
}));

jest.unstable_mockModule('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

const mockedArch = jest.fn();
const mockedPlatform = jest.fn();

jest.unstable_mockModule('node:os', () => ({
  arch: mockedArch,
  platform: mockedPlatform,
}));

jest.unstable_mockModule('node:path', () => ({
  resolve: jest.fn((...args: string[]) => args.join('/')),
}));

const architectures: NodeJS.Architecture[] = ['arm', 'x64'];
const version = '8.2.1';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDownloadObject', () => {
  describe.each(architectures)('when arch is %p', (arch) => {
    beforeEach(() => {
      mockedArch.mockReturnValue(arch as NodeJS.Architecture);
    });

    it('gets download object', async () => {
      const { getDownloadObject } = await import('./utils.js');
      expect(getDownloadObject(version)).toMatchSnapshot();
    });
  });
});

const directory = 'directory';
const name = 'name';

describe('getBinaryPath', () => {
  it('returns CLI path', async () => {
    const { getBinaryPath } = await import('./utils.js');
    expect(getBinaryPath(directory, name)).toMatchSnapshot();
  });
});

describe('getBinaryDirectory', () => {
  it.each(architectures)('returns CLI directory for arch %p', async (arch) => {
    mockedArch.mockReturnValueOnce(arch);
    const { getBinaryDirectory } = await import('./utils.js');
    expect(getBinaryDirectory(directory, version)).toMatchSnapshot();
  });
});

describe('getLauncherDirectory', () => {
  it('returns launcher directory', async () => {
    const { getLauncherDirectory } = await import('./utils.js');
    expect(getLauncherDirectory(directory)).toMatchSnapshot();
  });
});

describe('createUnixBinaryWrapper', () => {
  const command = '"cliPath"';

  it('creates wrapper binary', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { exec } = await import('@actions/exec');
    const { createUnixBinaryWrapper } = await import('./utils.js');
    await createUnixBinaryWrapper(directory, name, command);
    expect((mkdir as jest.Mock).mock.calls).toMatchSnapshot();
    expect((writeFile as jest.Mock).mock.calls).toMatchSnapshot();
    expect(exec as jest.Mock).toHaveBeenCalledWith('chmod', [
      '+x',
      `${directory}/${name}`,
    ]);
  });
});

describe('createLauncherBinary', () => {
  const cliPath = 'cliPath';
  const wrapperDirectory = 'wrapperDirectory';

  it.each(['darwin', 'linux'])(
    'creates launcher binary on %p',
    async (platform) => {
      mockedPlatform.mockReturnValue(platform as NodeJS.Platform);
      const { createLauncherBinary } = await import('./utils.js');
      await createLauncherBinary(
        directory,
        wrapperDirectory,
        name,
        cliPath,
        version,
      );
      const { writeFile } = await import('node:fs/promises');
      expect((writeFile as jest.Mock).mock.calls).toMatchSnapshot();
    },
  );

  it.each(['7.8.5', '8.2.3'])(
    'creates launcher binary on win32 and version %p',
    async (version) => {
      mockedPlatform.mockReturnValue('win32');
      const { writeFile } = await import('node:fs/promises');
      const { createLauncherBinary } = await import('./utils.js');
      await createLauncherBinary(
        directory,
        wrapperDirectory,
        name,
        cliPath,
        version,
      );
      expect((writeFile as jest.Mock).mock.calls).toMatchSnapshot();
    },
  );
});
