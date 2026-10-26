import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { uploadSourceMaps } from '../tools/upload-sourcemaps.js';

function fixture(t, name, build = true) {
  const app = mkdtempSync(resolve(tmpdir(), 'patchwork-maps-'));
  t.after(() => rmSync(app, { recursive: true, force: true }));
  writeFileSync(resolve(app, 'package.json'), JSON.stringify({ name }));
  if (build) mkdirSync(resolve(app, 'dist/src'), { recursive: true });
  const env = { SENTRY_AUTH_TOKEN: 'test-only', SENTRY_ORG: 'example', SENTRY_PROJECT: name,
    SENTRY_RELEASE: 'server-release', VITE_SENTRY_RELEASE: 'frontend-release' };
  return { app, env };
}

for (const name of ['bbdw-checkout', 'bbdw-users']) test(`${name}: publica mapas no build e release corretos`, t => {
  const { app, env } = fixture(t, name);
  const calls = [];
  uploadSourceMaps(app, { env, cli: 'mock-cli', run: (...args) => calls.push(args) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], ['sourcemaps', 'upload', 'dist/src', '--release', 'server-release', '--url-prefix', 'app:///src', '--validate', '--strict']);
  assert.equal(calls[0][2].cwd, app);
  assert.equal(calls[0][2].env, env);
});

test('storefront: injeta IDs antes de publicar o mesmo build com a release Vite', t => {
  const { app, env } = fixture(t, 'bbdw-storefront');
  const calls = [];
  uploadSourceMaps(app, { env, cli: 'mock-cli', run: (_cli, args, options) => calls.push({ args, cwd: options.cwd }) });
  assert.deepEqual(calls, [
    { args: ['sourcemaps', 'inject', 'dist'], cwd: app },
    { args: ['sourcemaps', 'upload', 'dist', '--release', 'frontend-release', '--validate', '--strict'], cwd: app }
  ]);
});

test('configuração inválida não injeta nem publica nada', t => {
  const { app, env } = fixture(t, 'bbdw-storefront');
  let calls = 0;
  for (const change of [{ SENTRY_PROJECT: 'bbdw-users' }, { VITE_SENTRY_RELEASE: '' }, { SENTRY_AUTH_TOKEN: '' }, { SENTRY_ORG: '' }]) {
    assert.throws(() => uploadSourceMaps(app, { env: { ...env, ...change }, cli: 'mock-cli', run: () => calls++ }));
  }
  const missing = fixture(t, 'bbdw-checkout', false);
  assert.throws(() => uploadSourceMaps(missing.app, { env: missing.env, cli: 'mock-cli', run: () => calls++ }), /Build ausente/);
  const unsupported = fixture(t, 'bbdw-catalog');
  assert.throws(() => uploadSourceMaps(unsupported.app, { env: unsupported.env, cli: 'mock-cli', run: () => calls++ }), /sem upload/);
  assert.equal(calls, 0);
});

test('falha na injeção impede upload do frontend', t => {
  const { app, env } = fixture(t, 'bbdw-storefront');
  const calls = [];
  assert.throws(() => uploadSourceMaps(app, { env, cli: 'mock-cli', run: (_cli, args) => {
    calls.push(args); throw new Error('injeção falhou');
  } }), /injeção falhou/);
  assert.equal(calls.length, 1);
});
