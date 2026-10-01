import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(scriptPath));
const defaultLibrary = join(root, 'public', 'exercise-library');
const artifactDir = join(root, '.exercise-library-artifacts');

export function requiredFiles(manifest) {
  if (!Array.isArray(manifest.exercises) || !manifest.exercises.length) throw new Error('Empty exercise manifest');
  const names = new Set();
  for (const exercise of manifest.exercises) {
    for (const asset of exercise.media ?? []) {
      if (!asset.localPath) continue; // Remote-only resources are not part of the local library.
      const name = asset.filename;
      if (typeof name !== 'string' || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+$/.test(name)
          || asset.localPath !== `/exercise-library/media/${name}`) {
        throw new Error(`Invalid media path: ${asset.localPath}`);
      }
      names.add(name);
    }
    for (const path of [exercise.localImagePath, exercise.localVideoPath].filter(Boolean)) {
      if (!names.has(path.replace('/exercise-library/media/', ''))) throw new Error(`Unlisted resource: ${path}`);
    }
  }
  if (!names.size || names.size !== manifest.assetCount) throw new Error('Manifest asset count does not match local resources');
  return [...names].sort();
}

async function manifestFiles(source) {
  return ['manifest.json', ...requiredFiles(JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'))).map((name) => `media/${name}`)];
}

async function digest(path) {
  const info = await lstat(path);
  if (!info.isFile() || !info.size) throw new Error(`Missing, empty or invalid file: ${path}`);
  const hash = createHash('sha256');
  let first = true;
  for await (const chunk of createReadStream(path)) {
    if (first && chunk.toString('utf8', 0, 80).startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error(`Git LFS pointer instead of the actual media file: ${path}`);
    }
    first = false;
    hash.update(chunk);
  }
  return { bytes: info.size, sha256: hash.digest('hex') };
}

export async function checkLibrary(source = defaultLibrary) {
  const files = {};
  for (const name of await manifestFiles(source)) files[name] = await digest(join(source, name));
  return { version: 1, files };
}

// Verify the complete input before touching the destination. Copy only changed
// files and keep older assets so sessions and older web versions can still use them.
export async function syncLibrary(source, destination) {
  source = resolve(source);
  destination = resolve(destination);
  const overlaps = (a, b) => { const rel = relative(a, b); return !rel || (!rel.startsWith('..') && !isAbsolute(rel)); };
  if (overlaps(source, destination) || overlaps(destination, source)) throw new Error('Source and destination must be separate folders');
  const expected = JSON.parse(await readFile(join(source, 'checksums.json'), 'utf8'));
  const actual = await checkLibrary(source);
  if (expected.version !== 1 || Object.keys(expected.files ?? {}).length !== Object.keys(actual.files).length) throw new Error('Invalid library checksums');
  for (const [name, hash] of Object.entries(actual.files)) {
    if (expected.files[name]?.sha256 !== hash.sha256 || expected.files[name]?.bytes !== hash.bytes) throw new Error(`Checksum mismatch: ${name}`);
  }
  await mkdir(join(destination, 'media'), { recursive: true });
  let copied = 0;
  // Publish manifest last, after all media has been installed.
  const names = [...Object.keys(actual.files).filter((name) => name !== 'manifest.json'), 'manifest.json'];
  for (const name of names) {
    let existing;
    try { existing = await digest(join(destination, name)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing?.sha256 === actual.files[name].sha256) continue;
    const temporary = `${join(destination, name)}.tmp-${randomUUID()}`;
    try {
      await copyFile(join(source, name), temporary);
      if ((await digest(temporary)).sha256 !== actual.files[name].sha256) throw new Error(`Source changed during copy: ${name}`);
      await rename(temporary, join(destination, name));
      copied++;
    } finally { await rm(temporary, { force: true }); }
  }
  return { copied, unchanged: names.length - copied };
}

async function packLibrary() {
  const inventory = await checkLibrary();
  await mkdir(artifactDir, { recursive: true });
  const staging = await mkdtemp(join(artifactDir, 'package-'));
  const archive = join(artifactDir, 'exercise-library.tar.gz');
  const temporaryArchive = join(artifactDir, `exercise-library-${randomUUID()}.tar.gz`);
  try {
    await mkdir(join(staging, 'media'));
    for (const name of Object.keys(inventory.files)) await copyFile(join(defaultLibrary, name), join(staging, name));
    await writeFile(join(staging, 'checksums.json'), JSON.stringify(inventory, null, 2));
    await copyFile(scriptPath, join(staging, 'install-library.mjs'));
    await writeFile(join(staging, 'README.txt'), 'Install: node install-library.mjs sync <unpacked-folder> <persistent-folder>\nSee DEPLOYMENT.md in the application repository.\n');
    const child = spawn('tar', ['-czf', temporaryArchive, '-C', staging, '.'], { stdio: 'inherit' });
    await new Promise((done, reject) => {
      child.on('error', reject);
      child.on('exit', (code) => code === 0 ? done() : reject(new Error(`tar exited with ${code}`)));
    });
    await rename(temporaryArchive, archive);
    console.log(`Library package: ${archive}`);
    console.log(`${Object.keys(inventory.files).length - 1} media files; ${Object.values(inventory.files).reduce((total, file) => total + file.bytes, 0)} bytes before compression.`);
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(temporaryArchive, { force: true });
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'check') {
    const result = await checkLibrary(args[0]);
    console.log(`Verified ${Object.keys(result.files).length - 1} media files.`);
  } else if (command === 'pack') {
    await packLibrary();
  } else if (command === 'requirements' && args.length === 1) {
    const manifest = JSON.parse(await readFile(join(defaultLibrary, 'manifest.json'), 'utf8'));
    await writeFile(resolve(args[0]), requiredFiles(manifest).join('\n') + '\n');
  } else if (command === 'sync' && args.length === 2) {
    console.log(JSON.stringify(await syncLibrary(args[0], args[1])));
  } else {
    throw new Error('Usage: exercise-library.mjs check [folder] | pack | requirements <file> | sync <package-folder> <persistent-folder>');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
