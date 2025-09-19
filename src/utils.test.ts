import fs from 'node:fs/promises';
import os from 'node:os';

import * as exec from '@actions/exec';

import {
  createLauncherBinary,
  getBinaryDirectory,
  getBinaryPath,
  getDownloadObject,
  getLauncherDirectory,
} from './utils';

jest.mock('@actions/exec');
const mockedExec = jest.mocked(exec);

jest.mock('node:fs/promises');
const mockedFs = jest.mocked(fs);

jest.mock('node:os');
const mockedOs = jest.mocked(os);

jest.mock('node:path', () => ({
  resolve: jest.fn((...args) => args.join('/')),
}));

const architectures: NodeJS.Architecture[] = ['arm', 'x64'];
const version = '8.2.1';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getDownloadObject', () => {
  describe.each(architectures)('when arch is %p', (arch) => {
    beforeEach(() => {
      mockedOs.arch.mockReturnValue(arch as NodeJS.Architecture);
    });

    it('gets download object', () => {
      expect(getDownloadObject(version)).toMatchSnapshot();
    });
  });
});

const directory = 'directory';
const name = 'name';

describe('getBinaryPath', () => {
  it('returns CLI path', () => {
    expect(getBinaryPath(directory, name)).toMatchSnapshot();
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
  const cliPath = 'cliPath';

  it.each(['darwin', 'linux'])(
    'creates launcher binary on %p',
    async (platform) => {
      mockedOs.platform.mockReturnValue(platform as NodeJS.Platform);
      await createLauncherBinary(directory, name, cliPath, version);
      expect(mockedFs.writeFile.mock.calls).toMatchSnapshot();
      expect(mockedExec.exec).toHaveBeenCalledWith('chmod', [
        '+x',
        `${directory}/${name}`,
      ]);
    },
  );

  it.each(['7.8.5', '8.2.3'])(
    'creates launcher binary on win32 and version %p',
    async (version) => {
      mockedOs.platform.mockReturnValue('win32');
      await createLauncherBinary(directory, name, cliPath, version);
      expect(mockedFs.writeFile.mock.calls).toMatchSnapshot();
    },
  );
});
