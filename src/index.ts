import { addPath, getInput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import {
  cacheDir,
  downloadTool,
  extractTar,
  extractZip,
} from '@actions/tool-cache';

import { getBinaryPath, getDownloadObject } from './utils';

export async function run() {
  try {
    // Get the version and name of the SDK to be installed
    const version = getInput('cli-version');
    const name = getInput('cli-name');

    // Download the specific version of the SDK (e.g., tarball/zipball)
    const download = getDownloadObject(version);
    const pathToTarball = await downloadTool(download.sdk);

    // Extract the tarball/zipball onto the host runner
    const extract = download.sdk.endsWith('.zip') ? extractZip : extractTar;
    const binaryDirectory = await extract(pathToTarball);

    // Rename the binary
    const binaryPath = getBinaryPath(binaryDirectory, name).replace('.sh', '');
    await exec('mv', [getBinaryPath(binaryDirectory, 'renpy'), binaryPath]);

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
