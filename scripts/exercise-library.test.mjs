import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkLibrary, requiredFiles, syncLibrary } from './exercise-library.mjs';

const manifest = {
  assetCount: 2,
  exercises: [{
    localImagePath: '/exercise-library/media/example.jpg',
    localVideoPath: '/exercise-library/media/example.mp4.mp4',
    media: [
      { filename: 'example.jpg', localPath: '/exercise-library/media/example.jpg' },
      { filename: 'example.mp4.mp4', localPath: '/exercise-library/media/example.mp4.mp4' },
    ],
  }],
};

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'personalgim-library-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'package');
  const destination = join(root, 'persistent');
  await mkdir(join(source, 'media'), { recursive: true });
  await writeFile(join(source, 'manifest.json'), JSON.stringify(manifest));
  await writeFile(join(source, 'media', 'example.jpg'), 'image');
  await writeFile(join(source, 'media', 'example.mp4.mp4'), 'video');
  await writeFile(join(source, 'checksums.json'), JSON.stringify(await checkLibrary(source)));
  return { source, destination };
}

test('installs once, skips unchanged files, and preserves assets used by older web versions', async (t) => {
  const { source, destination } = await fixture(t);
  assert.deepEqual(await syncLibrary(source, destination), { copied: 3, unchanged: 0 });
  await writeFile(join(destination, 'media', 'older.jpg'), 'keep');
  assert.deepEqual(await syncLibrary(source, destination), { copied: 0, unchanged: 3 });
  await writeFile(join(source, 'media', 'example.jpg'), 'new image');
  await writeFile(join(source, 'checksums.json'), JSON.stringify(await checkLibrary(source)));
  assert.deepEqual(await syncLibrary(source, destination), { copied: 1, unchanged: 2 });
  assert.equal(await readFile(join(destination, 'media', 'older.jpg'), 'utf8'), 'keep');
  assert.equal(await readFile(join(destination, 'media', 'example.jpg'), 'utf8'), 'new image');
});

test('rejects a corrupted package before changing existing assets', async (t) => {
  const { source, destination } = await fixture(t);
  await syncLibrary(source, destination);
  await writeFile(join(source, 'media', 'example.jpg'), 'corrupt');
  await assert.rejects(syncLibrary(source, destination), /Checksum mismatch/);
  assert.equal(await readFile(join(destination, 'media', 'example.jpg'), 'utf8'), 'image');
});

test('rejects missing media and overlapping folders', async (t) => {
  const { source, destination } = await fixture(t);
  await assert.rejects(syncLibrary(source, source), /separate folders/);
  await rm(join(source, 'media', 'example.mp4.mp4'));
  await assert.rejects(syncLibrary(source, destination), /ENOENT/);
});

test('rejects Git LFS placeholders instead of packaging unavailable media', async (t) => {
  const { source } = await fixture(t);
  await writeFile(join(source, 'media', 'example.jpg'), 'version https://git-lfs.github.com/spec/v1\noid sha256:placeholder\nsize 100\n');
  await assert.rejects(checkLibrary(source), /Git LFS pointer/);
});

test('rejects traversal, inconsistent references and incorrect counts in the manifest', () => {
  const invalid = structuredClone(manifest);
  invalid.exercises[0].media[0] = { filename: '../secret.jpg', localPath: '/exercise-library/media/../secret.jpg' };
  assert.throws(() => requiredFiles(invalid), /Invalid media path/);
  const missing = structuredClone(manifest);
  missing.exercises[0].localVideoPath = '/exercise-library/media/missing.mp4';
  assert.throws(() => requiredFiles(missing), /Unlisted resource/);
  assert.throws(() => requiredFiles({ ...manifest, assetCount: 3 }), /asset count/);
});
