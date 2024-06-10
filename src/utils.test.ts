import * as exec from '@actions/exec';
import fs from 'fs/promises';
import os from 'os';

import {
  createLauncherBinary,
  getBinaryDirectory,
  getBinaryPath,
  getDownloadObject,
  getLauncherDirectory,
} from './utils';

jest.mock('@actions/exec');
const mockedExec = jest.mocked(exec);

jest.mock('fs/promises');
const mockedFs = jest.mocked(fs);

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

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getDownloadObject', () => {
  describe.each(table)('when OS is %p and arch is %p', (os, arch) => {
    beforeEach(() => {
      mockedOs.platform.mockReturnValue(os as NodeJS.Platform);
      mockedOs.arch.mockReturnValue(arch);
    });

    it('gets download object', () => {
      expect(getDownloadObject(version)).toMatchSnapshot();
    });
  });
});

const directory = 'directory';
const name = 'name';

describe('getBinaryPath', () => {
  describe.each(platforms)('when OS is %p', (os) => {
    beforeEach(() => {
      mockedOs.platform.mockReturnValue(os);
    });

    it('returns CLI filepath', () => {
      expect(getBinaryPath(directory, name)).toMatchSnapshot();
    });
  });
});

describe('getBinaryDirectory', () => {
  it.each(architectures)('returns CLI directory for arch %p', (arch) => {
    mockedOs.arch.mockReturnValueOnce(arch);
    expect(getBinaryDirectory(directory, version)).toMatchSnapshot();
  });
});

describe('getLauncherDirectory', () => {
  it('returns launcher directory', () => {
    expect(getLauncherDirectory(directory)).toMatchSnapshot();
  });
});

describe('createLauncherBinary', () => {
  it('creates launcher binary', async () => {
    const cliPath = 'cliPath';
    const launcherPath = `${directory}/${name}`;
    await createLauncherBinary(directory, name, cliPath);
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      launcherPath,
      `${cliPath} ${directory}/launcher "$@"`,
    );
    expect(mockedExec.exec).toHaveBeenCalledWith('chmod', ['+x', launcherPath]);
  });
});
