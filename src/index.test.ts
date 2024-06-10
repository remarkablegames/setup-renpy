import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as tc from '@actions/tool-cache';
import os from 'os';

import { run } from '.';

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/tool-cache');
jest.mock('os');

const mockedCore = jest.mocked(core);
const mockedExec = jest.mocked(exec);
const mockedTc = jest.mocked(tc);
const mockedOs = jest.mocked(os);

beforeEach(() => {
  jest.resetAllMocks();
});

const name = 'cli-name';
const version = '1.2.3';
const pathToTarball = 'path/to/tarball';
const pathToCLI = 'path/to/cli';

describe.each([
  ['linux', 'arm64'],
  ['win32', 'x64'],
])('when os is %p and arch is %p', (os, arch) => {
  beforeEach(() => {
    mockedOs.platform.mockReturnValue(os as NodeJS.Platform);
    mockedOs.arch.mockReturnValue(arch as NodeJS.Architecture);

    mockedCore.getInput.mockImplementation((input) => {
      switch (input) {
        case 'cli-version':
          return version;
        case 'cli-name':
          return name;
        default:
          return '';
      }
    });
  });

  it('downloads, extracts, and adds SDK to PATH', async () => {
    mockedTc.downloadTool.mockResolvedValueOnce(pathToTarball);
    const extract = os === 'win32' ? mockedTc.extractZip : mockedTc.extractTar;
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
      expect.stringContaining(name),
    ]);

    const sdkDirectory = `${pathToCLI}/renpy-${version}-sdk${arch.includes('arm') ? 'arm' : ''}`;
    expect(mockedTc.cacheDir).toHaveBeenCalledWith(sdkDirectory, name, version);
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
          return name;
        case 'rapt':
          return String(inputs.rapt);
        case 'renios':
          return String(inputs.renios);
        case 'web':
          return String(inputs.web);
        default:
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
          `${pathToCLI}/renpy-${version}-sdk`,
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
