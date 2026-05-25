import { mkdtemp, rm } from 'node:fs/promises';
import { platform, tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { addPath, getInput, setFailed, setOutput } from '@actions/core';
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
  find,
} from '@actions/tool-cache';

import {
  createLauncherBinary,
  createUnixBinaryWrapper,
  getBinaryDirectory,
  getBinaryPath,
  getDownloadObject,
  getLauncherDirectory,
} from './utils';

const ADDONS = ['rapt', 'renios', 'web'] as const;

export async function run() {
  try {
    // Get the name and version of the SDK
    const cliName = getInput('cli-name');
    const launcherName = getInput('launcher-name');
    const version = getInput('cli-version');
    const addons = ADDONS.filter((addon) => getInput(addon) === 'true');
    const toolName = [cliName, ...addons].join('_');

    // Find previously cached directory (if applicable)
    let binaryDirectory = find(toolName, version);
    const isCached = Boolean(binaryDirectory);

    /* istanbul ignore else */
    if (!isCached) {
      // Download the specific version of the SDK (e.g., tarball/zipball)
      const download = getDownloadObject(version);
      const pathToTarball = await downloadTool(download.sdk);

      // Extract the tarball/zipball onto the host runner
      const extract = download.sdk.endsWith('.zip') ? extractZip : extractTar;
      binaryDirectory = getBinaryDirectory(
        await extract(pathToTarball),
        version,
      );

      // Add Android/iOS/Web support
      await Promise.all(
        addons.map((addon) =>
          downloadTool(download[addon]).then((downloadPath) =>
            extractZip(downloadPath, binaryDirectory),
          ),
        ),
      );
    }

    // Expose SDK Launcher path
    const launcherDirectory = getLauncherDirectory(binaryDirectory);
    setOutput('launcher', launcherDirectory);

    const binaryPath = getBinaryPath(binaryDirectory, 'renpy');
    const temporaryDirectory = process.env['RUNNER_TEMP'] ?? tmpdir();
    const wrapperDirectory =
      platform() === 'win32'
        ? binaryDirectory
        : await mkdtemp(resolve(temporaryDirectory, 'setup-renpy-'));

    if (platform() !== 'win32') {
      await createUnixBinaryWrapper(
        wrapperDirectory,
        cliName,
        `"${binaryPath}"`,
      );
    }

    // Create the launcher binary
    await createLauncherBinary(
      binaryDirectory,
      wrapperDirectory,
      launcherName,
      binaryPath,
      version,
    );

    // Expose the wrapper directory by adding it to the PATH.
    addPath(wrapperDirectory);

    // Cache the SDK
    /* istanbul ignore else */
    if (!isCached) {
      await Promise.all(
        [
          'doc',
          'gui',
          'LICENSE.txt',
          'sdk-fonts',
          'the_question',
          'update',
        ].map((path) =>
          rm(resolve(binaryDirectory, path), { force: true, recursive: true }),
        ),
      );

      await cacheDir(binaryDirectory, toolName, version);
    }
  } catch (error) {
    /* istanbul ignore else */
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

run();
