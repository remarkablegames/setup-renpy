import { mkdir, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { resolve } from 'node:path';

import { exec } from '@actions/exec';

/**
 * Wraps `path.resolve` to avoid ncc's asset relocator.
 *
 * ncc 0.45 treats literal strings inside `path.resolve(...)` / `path.join(...)`
 * as static asset references and copies matching project files into `dist`.
 * This wrapper delegates to `path.resolve` but hides the call from the static
 * analyzer, so runtime path construction is not mistaken for a bundled asset.
 *
 * @param paths - Path segments to resolve.
 * @returns Resolved path.
 */
export function resolvePath(...paths: string[]) {
  return resolve(...paths);
}

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
 * Gets CLI path (excludes Windows `.exe`).
 *
 * @param directory - Directory
 * @param name - CLI name
 * @returns - Binary path
 */
export function getBinaryPath(directory: string, name: string) {
  return resolvePath(directory, `${name}.sh`);
}

/**
 * Gets CLI directory.
 *
 * @param directory - Directory
 * @param version - CLI version
 * @returns - Binary directory
 */
export function getBinaryDirectory(directory: string, version: string) {
  return resolve(
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
  return resolvePath(directory, 'launcher');
}

/**
 * Creates Unix binary wrapper.
 *
 * @param directory - Wrapper directory
 * @param name - Binary name
 * @param command - Command to execute
 */
export async function createUnixBinaryWrapper(
  directory: string,
  name: string,
  command: string,
) {
  const wrapperPath = resolve(directory, name);
  await mkdir(directory, { recursive: true });
  await writeFile(wrapperPath, `#!/usr/bin/env bash\nexec ${command} "$@"\n`);
  await exec('chmod', ['+x', wrapperPath]);
}

/**
 * Creates Windows binary wrapper.
 *
 * @param directory - Wrapper directory
 * @param name - Binary name
 * @param command - Command to execute
 */
export async function createWindowsBinaryWrapper(
  directory: string,
  name: string,
  command: string,
) {
  const wrapperPath = resolvePath(directory, `${name}.bat`);
  await mkdir(directory, { recursive: true });
  await writeFile(wrapperPath, `@echo off\r\n${command} %*\r\n`);
}

/**
 * Creates launcher binary.
 *
 * @param binaryDirectory - Binary directory
 * @param wrapperDirectory - Wrapper directory
 * @param launcherName - Launcher name
 * @param cliPath - Binary path
 * @param version - CLI version
 */
export async function createLauncherBinary(
  binaryDirectory: string,
  wrapperDirectory: string,
  launcherName: string,
  cliPath: string,
  version: string,
) {
  if (platform() === 'win32') {
    const pythonExecutable = resolve(
      binaryDirectory,
      'lib',
      `py${version.startsWith('7.') ? '2' : '3'}-windows-x86_64`,
      'python.exe',
    );
    await createWindowsBinaryWrapper(
      wrapperDirectory,
      launcherName,
      `"${pythonExecutable}" "${resolve(binaryDirectory, 'renpy.py')}" "${getLauncherDirectory(binaryDirectory)}"`,
    );
  } else {
    await createUnixBinaryWrapper(
      wrapperDirectory,
      launcherName,
      `"${cliPath}" "${getLauncherDirectory(binaryDirectory)}"`,
    );
  }
}
