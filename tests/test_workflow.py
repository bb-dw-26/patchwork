"""Contrato do workflow e execução real das verificações de entrada via Node."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = yaml.load((ROOT / '.github/workflows/patchwork.yml').read_text(encoding='utf-8'), Loader=yaml.BaseLoader)
JOBS = WORKFLOW['jobs']


class WorkflowTests(unittest.TestCase):
    def run_guard(self, name, env, cwd):
        step = next(step for step in JOBS['prepare']['steps'] if step.get('name') == name)
        script = step['run'].split("<<'NODE'\n", 1)[1].rsplit('\nNODE', 1)[0]
        return subprocess.run(['node', '--input-type=module', '-e', script], cwd=cwd,
                              env={**os.environ, **env}, capture_output=True, text=True)

    def test_adapter_and_issue_guards(self):
        with tempfile.TemporaryDirectory(prefix='patchwork-test-') as directory:
            root = Path(directory)
            (root / 'scripts').mkdir()
            (root / 'scripts/adapter.mjs').write_text('// fixture\n', encoding='utf-8')
            env = {'PATCHWORK_ADAPTER': 'scripts/adapter.mjs', 'ISSUE_NUMBER': '42'}
            self.assertEqual(self.run_guard('Conferir entradas', env, root).returncode, 0)
            for path in ('../outside.mjs', '/tmp/adapter.mjs', 'scripts/absent.mjs', 'scripts/a;echo.mjs'):
                with self.subTest(path=path):
                    self.assertNotEqual(self.run_guard('Conferir entradas', {**env, 'PATCHWORK_ADAPTER': path}, root).returncode, 0)
            for issue in ('0', '-1', '42\n', '42; echo nope', ''):
                with self.subTest(issue=issue):
                    self.assertNotEqual(self.run_guard('Conferir entradas', {**env, 'ISSUE_NUMBER': issue}, root).returncode, 0)

    def test_resolved_identity_must_match_request(self):
        env = {'BASE_SHA': 'a' * 40, 'RESOLVED_ISSUE': '42', 'ISSUE_NUMBER': '42'}
        name = 'Conferir identidade resolvida pelo adaptador'
        self.assertEqual(self.run_guard(name, env, ROOT).returncode, 0)
        for override in ({'BASE_SHA': 'main'}, {'BASE_SHA': 'a' * 40 + '\n'}, {'RESOLVED_ISSUE': '43'}):
            self.assertNotEqual(self.run_guard(name, {**env, **override}, ROOT).returncode, 0)

    def test_only_publisher_has_write_permissions_and_no_agent_secret(self):
        self.assertEqual(WORKFLOW['permissions'], {'contents': 'read'})
        for name, job in JOBS.items():
            permissions = job.get('permissions', WORKFLOW['permissions'])
            writes = {key for key, value in permissions.items() if value == 'write'}
            self.assertEqual(writes, {'contents', 'pull-requests'} if name == 'publish' else set())
            payload = str(job)
            if name != 'prepare':
                self.assertNotIn('secrets.SENTRY_AUTH_TOKEN', payload)
            if name != 'propose':
                self.assertNotIn('secrets.OPENAI_API_KEY', payload)

    def test_validation_is_required_and_publish_does_not_run_proposal(self):
        self.assertEqual(JOBS['validate']['needs'], ['prepare', 'propose'])
        self.assertEqual(JOBS['publish']['needs'], ['prepare', 'validate'])
        self.assertEqual([step['run'] for step in JOBS['publish']['steps'] if 'run' in step],
                         ['node "automation/$PATCHWORK_ADAPTER" publish'])
        for name, job in JOBS.items():
            for step in job['steps']:
                if step.get('uses', '').startswith('actions/checkout@'):
                    settings = step['with']
                    self.assertEqual(settings['ref'], '${{ needs.prepare.outputs.sha }}' if settings.get('path') == 'app' else '${{ github.workflow_sha }}')
                    if name != 'publish' or settings.get('path') != 'app':
                        self.assertEqual(settings['persist-credentials'], 'false')


if __name__ == '__main__':
    unittest.main()
