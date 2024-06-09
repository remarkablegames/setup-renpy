import { addPath, getInput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
} from '@actions/tool-cache';

import { CLI_NAME, VERSION } from './constants';
import { getBinaryPath, getDownloadObject } from './utils';

export async function run() {
  try {
    // Get the version and name of the SDK to be installed
    const version = getInput('cli-version') || VERSION;
    const name = getInput('cli-name') || CLI_NAME;

    // Download the specific version of the SDK (e.g., tarball/zipball)
    const download = getDownloadObject(version);
    const pathToTarball = await downloadTool(download.sdk);

    // Extract the tarball/zipball onto the host runner
    const extract = download.sdk.endsWith('.zip') ? extractZip : extractTar;
    const binaryDirectory = await extract(pathToTarball);

    // Get or rename the binary path
    const binaryPath = getBinaryPath(binaryDirectory, name);
    if (name !== CLI_NAME) {
      await exec('mv', [getBinaryPath(binaryDirectory, CLI_NAME), binaryPath]);
    }

    // Add Android/iOS/Web support
    await Promise.all(
      (['rapt', 'renios', 'web'] as const)
        .filter((platform) => getInput(platform) === 'true')
        .map((platform) =>
          downloadTool(download[platform], binaryDirectory).then(
            (downloadPath) => extractZip(downloadPath, binaryDirectory),
          ),
        ),
    );

    // Cache the SDK
    await cacheDir(binaryDirectory, name, version);

    // Expose the SDK by adding it to the PATH
    addPath(binaryDirectory);
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

run();
