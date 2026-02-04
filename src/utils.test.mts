import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/exec', () => ({
  exec: jest.fn(),
}));

jest.unstable_mockModule('node:fs/promises', () => ({
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

describe('createLauncherBinary', () => {
  const cliPath = 'cliPath';

  it.each(['darwin', 'linux'])(
    'creates launcher binary on %p',
    async (platform) => {
      mockedPlatform.mockReturnValue(platform as NodeJS.Platform);
      const { writeFile } = await import('node:fs/promises');
      const { exec } = await import('@actions/exec');
      const { createLauncherBinary } = await import('./utils.js');
      await createLauncherBinary(directory, name, cliPath, version);
      expect((writeFile as jest.Mock).mock.calls).toMatchSnapshot();
      expect(exec as jest.Mock).toHaveBeenCalledWith('chmod', [
        '+x',
        `${directory}/${name}`,
      ]);
    },
  );

  it.each(['7.8.5', '8.2.3'])(
    'creates launcher binary on win32 and version %p',
    async (version) => {
      mockedPlatform.mockReturnValue('win32');
      const { writeFile } = await import('node:fs/promises');
      const { createLauncherBinary } = await import('./utils.js');
      await createLauncherBinary(directory, name, cliPath, version);
      expect((writeFile as jest.Mock).mock.calls).toMatchSnapshot();
    },
  );
});
