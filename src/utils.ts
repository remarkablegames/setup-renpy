import os from 'os';
import path from 'path';

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
    sdk: `https://www.renpy.org/dl/${version}/renpy-${version}-sdk${os.arch().includes('arm') ? 'arm.tar.bz2' : '.zip'}`,
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
  return path.join(
    directory,
    name + (os.platform() === 'win32' ? '.exe' : '.sh'),
  );
}
