import { exec } from '@actions/exec';
import { writeFile } from 'fs/promises';
import { arch, platform } from 'os';
import { join } from 'path';

/**
 * Gets download object.
 *
 * @see {@link https://www.renpy.org/latest.html}
 *
 * @param version - CLI version
 * @returns - Download map
 */
export function getDownloadObject(version: string) {
  return {
    sdk: `https://www.renpy.org/dl/${version}/renpy-${version}-sdk${arch().includes('arm') ? 'arm.tar.bz2' : '.zip'}`,
    rapt: `https://www.renpy.org/dl/${version}/renpy-${version}-rapt.zip`,
    renios: `https://www.renpy.org/dl/${version}/renpy-${version}-renios.zip`,
    web: `https://www.renpy.org/dl/${version}/renpy-${version}-web.zip`,
  };
}

/**
 * Gets CLI path.
 *
 * @param directory - Directory
 * @param name - CLI name
 * @returns - Binary path
 */
export function getBinaryPath(directory: string, name: string) {
  return join(directory, name + (platform() === 'win32' ? '.exe' : '.sh'));
}

/**
 * Gets CLI directory.
 *
 * @param directory - Directory
 * @param version - CLI version
 * @returns - Binary directory
 */
export function getBinaryDirectory(directory: string, version: string) {
  return join(
    directory,
    `renpy-${version}-sdk${arch().includes('arm') ? 'arm' : ''}`,
  );
}

/**
 * Gets launcher directory.
 *
 * @param directory - Directory
 * @returns - Launcher directory
 */
export function getLauncherDirectory(directory: string) {
  return join(directory, 'launcher');
}

/**
 * Creates launcher binary.
 *
 * @param directory - Binary directory
 * @param name - Launcher name
 * @param cliPath - Binary path
 */
export async function createLauncherBinary(
  directory: string,
  name: string,
  cliPath: string,
) {
  const launcherPath = join(directory, name);
  await writeFile(
    launcherPath,
    `${cliPath} ${getLauncherDirectory(directory)} "$@"`,
  );
  await exec('chmod', ['+x', launcherPath]);
}
