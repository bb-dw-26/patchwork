import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifySentrySmoke } from '../scripts/sentry-smoke.mjs';

test('smoke exige skill invocada e consulta Sentry concluída, não apenas conexão ou tentativa', () => {
  const good = { mcpConnected: true, skillsUsed: ['patchwork-sentry'],
    mcpCalls: [{ tool: 'search_issues', success: true }] };
  assert.doesNotThrow(() => verifySentrySmoke(good));
  for (const override of [{ mcpConnected: false }, { skillsUsed: [] }, { mcpCalls: [] },
    { mcpCalls: [{ tool: 'search_issues', success: false }] },
    { mcpCalls: [{ tool: 'unrelated', success: true }] }]) {
    assert.throws(() => verifySentrySmoke({ ...good, ...override }));
  }
});
