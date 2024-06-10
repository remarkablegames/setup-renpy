import { addPath, getInput, setFailed, setOutput } from '@actions/core';
import { exec } from '@actions/exec';
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
} from '@actions/tool-cache';

import {
  createLauncherBinary,
  getBinaryDirectory,
  getBinaryPath,
  getDownloadObject,
  getLauncherDirectory,
} from './utils';

export async function run() {
  try {
    // Get the version and name of the SDK to be installed
    const version = getInput('cli-version');
    const cliName = getInput('cli-name');
    const launcherName = getInput('launcher-name');

    // Download the specific version of the SDK (e.g., tarball/zipball)
    const download = getDownloadObject(version);
    const pathToTarball = await downloadTool(download.sdk);

    // Extract the tarball/zipball onto the host runner
    const extract = download.sdk.endsWith('.zip') ? extractZip : extractTar;
    const binaryDirectory = getBinaryDirectory(
      await extract(pathToTarball),
      version,
    );

    // Rename the binary
    const binaryPath = getBinaryPath(binaryDirectory, cliName).replace(
      '.sh',
      '',
    );
    await exec('mv', [getBinaryPath(binaryDirectory, 'renpy'), binaryPath]);

    // Add Android/iOS/Web support
    const addons = (['rapt', 'renios', 'web'] as const).filter(
      (addon) => getInput(addon) === 'true',
    );
    await Promise.all(
      addons.map((addon) =>
        downloadTool(download[addon]).then((downloadPath) =>
          extractZip(downloadPath, binaryDirectory),
        ),
      ),
    );

    // Expose SDK Launcher path
    const launcherDirectory = getLauncherDirectory(binaryDirectory);
    setOutput('launcher', launcherDirectory);

    // Create the launcher binary
    await createLauncherBinary(binaryDirectory, launcherName, binaryPath);

    // Expose the SDK by adding it to the PATH
    addPath(binaryDirectory);

    // Cache the SDK
    await cacheDir(binaryDirectory, [cliName, ...addons].join('_'), version);
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

run();
