import os from 'os';

import {
  getAddonDirectory,
  getBinaryDirectory,
  getBinaryPath,
  getDownloadObject,
  getLauncherDirectory,
} from './utils';

jest.mock('os');
const mockedOs = jest.mocked(os);

const platforms = ['darwin', 'linux', 'win32'] as const;
const architectures = ['arm', 'x32', 'x64'] as const;

const table = platforms.reduce(
  (testSuites, os) => [
    ...testSuites,
    ...architectures.map((arch) => [os, arch] as [string, string]),
  ],
  [] as [string, string][],
);

const version = '8.2.1';

describe('getDownloadObject', () => {
  describe.each(table)('when OS is %p and arch is %p', (os, arch) => {
    beforeEach(() => {
      jest.resetAllMocks();
      mockedOs.platform.mockReturnValueOnce(os as NodeJS.Platform);
      mockedOs.arch.mockReturnValueOnce(arch);
    });

    it('gets download object', () => {
      expect(getDownloadObject(version)).toMatchSnapshot();
    });
  });
});

describe('getBinaryPath', () => {
  describe.each(platforms)('when OS is %p', (os) => {
    beforeEach(() => {
      jest.resetAllMocks();
      mockedOs.platform.mockReturnValueOnce(os);
    });

    it('returns CLI filepath', () => {
      const directory = 'directory';
      const name = 'name';
      expect(getBinaryPath(directory, name)).toMatchSnapshot();
    });
  });
});

describe('getBinaryDirectory', () => {
  it.each(architectures)('returns CLI directory for arch %p', (arch) => {
    mockedOs.arch.mockReturnValueOnce(arch);
    const directory = 'directory';
    expect(getBinaryDirectory(directory, version)).toMatchSnapshot();
  });
});

describe('getLauncherDirectory', () => {
  it('returns launcher directory', () => {
    const directory = 'directory';
    expect(getLauncherDirectory(directory)).toMatchSnapshot();
  });
});

describe('getAddonDirectory', () => {
  it.each(['rapt', 'renios', 'web'])(
    'returns addon directory for %p',
    (addon) => {
      const directory = 'directory';
      expect(getAddonDirectory(directory, addon)).toMatchSnapshot();
    },
  );
});
