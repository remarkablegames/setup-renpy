import os from 'node:os';
import { resolve } from 'node:path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';

import { run } from '.';
import { createLauncherBinary } from './utils';

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/tool-cache');
jest.mock('node:os');

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  createLauncherBinary: jest.fn(),
}));

const mockedCore = jest.mocked(core);
const mockedExec = jest.mocked(exec);
const mockedTc = jest.mocked(tc);
const mockedOs = jest.mocked(os);

beforeEach(() => {
  jest.resetAllMocks();
});

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
    mockedOs.platform.mockReturnValue(platform as NodeJS.Platform);
    mockedOs.arch.mockReturnValue(arch as NodeJS.Architecture);

    mockedCore.getInput.mockImplementation((input) => {
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
          // eslint-disable-next-line no-console
          console.error(`Invalid input: ${input}`);
          return '';
      }
    });
  });

  it('downloads, extracts, and adds SDK to PATH', async () => {
    mockedTc.downloadTool.mockResolvedValueOnce(pathToTarball);
    const extract =
      platform === 'win32' ? mockedTc.extractZip : mockedTc.extractTar;
    extract.mockResolvedValueOnce(pathToCLI);

    await run();

    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      expect.stringContaining(
        `https://www.renpy.org/dl/${version}/renpy-${version}-sdk`,
      ),
    );

    expect(extract).toHaveBeenCalledWith(pathToTarball);

    expect(mockedExec.exec).toHaveBeenCalledWith('mv', [
      expect.stringContaining('renpy'),
      expect.stringContaining(cliName),
    ]);

    const sdkDirectory = resolve(
      `${pathToCLI}/renpy-${version}-sdk${arch.includes('arm') ? 'arm' : ''}`,
    );

    expect(createLauncherBinary).toHaveBeenCalledWith(
      sdkDirectory,
      launcherName,
      expect.stringContaining(cliName),
      version,
    );

    expect(mockedExec.exec).toHaveBeenCalledWith('rm', [
      '-rf',
      ...[
        'doc',
        'gui',
        'LICENSE.txt',
        'sdk-fonts',
        'the_question',
        'update',
      ].map((path) => resolve(sdkDirectory, path)),
    ]);

    expect(mockedTc.cacheDir).toHaveBeenCalledWith(
      sdkDirectory,
      cliName,
      version,
    );

    expect(mockedCore.addPath).toHaveBeenCalledWith(sdkDirectory);

    expect(mockedCore.setOutput).toHaveBeenCalledWith(
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
    mockedOs.platform.mockReturnValue('darwin');
    mockedOs.arch.mockReturnValue('x64');

    mockedCore.getInput.mockImplementation((input) => {
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
          // eslint-disable-next-line no-console
          console.error(`Invalid input: ${input}`);
          return '';
      }
    });
  });

  it('downloads, extracts, and adds SDK to PATH', async () => {
    mockedTc.downloadTool.mockResolvedValue(pathToTarball);
    mockedTc.extractZip.mockResolvedValue(pathToCLI);

    await run();

    Object.entries(inputs).forEach(([key, value]) => {
      if (value) {
        expect(mockedTc.downloadTool).toHaveBeenCalledWith(
          `https://www.renpy.org/dl/${version}/renpy-${version}-${key}.zip`,
        );

        expect(mockedTc.extractZip).toHaveBeenCalledWith(
          pathToTarball,
          expect.stringContaining(`${pathToCLI}/renpy-${version}-sdk`),
        );
      }
    });
  });
});

describe('error', () => {
  it('throws error', async () => {
    const message = 'error';
    mockedCore.getInput.mockImplementationOnce(() => {
      throw new Error(message);
    });
    await run();
    expect(mockedCore.setFailed).toHaveBeenCalledWith(message);
  });
});
