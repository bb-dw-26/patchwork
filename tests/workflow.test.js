import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const read = name => parse(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), 'utf8'));
const workflow = read('patchwork');
const job = workflow.jobs.repair;
const step = id => job.steps.find(s => s.id === id);

test('um job, dois checkouts, CLI direto e nenhum artefato ou executor próprio', () => {
  assert.deepEqual(Object.keys(workflow.jobs), ['repair']);
  assert.equal(job.steps.filter(s => s.uses?.startsWith('actions/checkout@')).length, 2);
  const [engine, app] = job.steps.filter(s => s.uses?.startsWith('actions/checkout@'));
  assert.equal(engine.with.repository, '${{ job.workflow_repository }}');
  assert.equal(engine.with.ref, '${{ job.workflow_sha }}');
  assert.equal(app.with.ref, '${{ github.ref }}');
  for (const action of job.steps.filter(s => s.uses)) assert.match(action.uses, /@v[346]$/);
  assert.ok(job.steps.every(s => s.name));
  const text = JSON.stringify(workflow);
  assert.doesNotMatch(text, /upload-artifact|download-artifact|copilot-sdk|agent\.mjs|bubblewrap|setfacl|automation/);
  assert.doesNotMatch(text, /candidate\.patch|incident\.json|validation\.(json|md)|agent-context\.json|execution\.json|regression-before\.log|report\.md/);
  assert.match(step('copilot').run, /copilot "\$@"/);
  assert.match(step('copilot').run, /--disable-builtin-mcps/);
  // O token precisa chegar ao MCP; --secret-env-vars também remove o ambiente dos servidores.
  assert.doesNotMatch(step('copilot').run, /--secret-env-vars/);
  assert.equal(step('copilot').env.SENTRY_ACCESS_TOKEN, '${{ secrets.SENTRY_AUTH_TOKEN }}');
  assert.equal(job.permissions['copilot-requests'], 'write');
});

test('verificação única, tokens posteriores e cleanup mesmo em falha', () => {
  assert.equal(workflow.on.workflow_call.inputs.check_command.default, 'npm run check');
  assert.equal(step('check').run, '${{ inputs.check_command }}');
  assert.equal(step('check').if, "steps.result.outputs.outcome == 'repair'");
  assert.match(step('publisher').if, /steps.check.outcome == 'success'/);
  assert.equal(step('forwarder').if, "steps.result.outputs.outcome == 'handoff'");
  assert.ok(job.steps.indexOf(step('publisher')) > job.steps.indexOf(step('check')));
  assert.equal(step('forwarder').with['permission-issues'], 'write');
  assert.doesNotMatch(JSON.stringify(step('copilot')), /PRIVATE_KEY|publisher|forwarder/);
  assert.equal(job.steps.at(-1).if, 'always()');
  assert.match(job.steps.at(-1).run, /cleanup/);
});

test('smoke usa o mesmo CLI, sem publicar ou guardar evidência', () => {
  const workflow = read('sentry-smoke');
  assert.deepEqual(Object.keys(workflow.jobs), ['smoke']);
  const smoke = workflow.jobs.smoke;
  assert.equal(smoke.steps.filter(s => s.uses?.startsWith('actions/checkout@')).length, 2);
  assert.equal(smoke.steps.find(s => s.id === 'copilot').run, step('copilot').run);
  assert.doesNotMatch(JSON.stringify(smoke), /create-github-app-token|upload-artifact|download-artifact|execution\.json/);
});
