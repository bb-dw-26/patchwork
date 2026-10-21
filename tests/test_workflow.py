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
    def test_only_publisher_has_write_permissions_and_no_agent_secret(self):
        self.assertEqual(WORKFLOW['permissions'], {'contents': 'read'})
        for name, job in JOBS.items():
            permissions = job.get('permissions', WORKFLOW['permissions'])
            writes = {key for key, value in permissions.items() if value == 'write'}
            self.assertEqual(writes, {'contents', 'pull-requests'} if name == 'publish' else set())
            payload = str(job)
            if name not in ('prepare', 'propose'):
                self.assertNotIn('secrets.SENTRY_AUTH_TOKEN', payload)
            if name != 'propose':
                self.assertNotIn('secrets.OPENAI_API_KEY', payload)

    def test_validation_is_required_and_publish_does_not_run_proposal(self):
        self.assertEqual(JOBS['validate']['needs'], ['prepare', 'propose'])
        self.assertEqual(JOBS['publish']['needs'], ['prepare', 'validate'])
        self.assertEqual([step['run'] for step in JOBS['publish']['steps'] if 'run' in step],
                         ['node patchwork/scripts/engine.mjs publish'])
        for name, job in JOBS.items():
            for step in job['steps']:
                if step.get('uses', '').startswith('actions/checkout@'):
                    settings = step['with']
                    self.assertEqual(settings['ref'], {'app': '${{ needs.prepare.outputs.sha }}', 'automation': '${{ github.workflow_sha }}', 'patchwork': '${{ job.workflow_sha }}'}[settings['path']])
                    if settings['path'] == 'patchwork':
                        self.assertEqual(settings['repository'], '${{ job.workflow_repository }}')
                    if name != 'publish' or settings.get('path') != 'app':
                        self.assertEqual(settings['persist-credentials'], 'false')

    def test_skills_and_mcp_precede_agent(self):
        steps = JOBS['propose']['steps']
        setup = next(i for i,s in enumerate(steps) if s.get('run') == 'node patchwork/scripts/context.mjs')
        agent = next(i for i,s in enumerate(steps) if s.get('uses','').startswith('openai/codex-action@'))
        self.assertLess(setup, agent)
        self.assertEqual(steps[agent]['with']['codex-home'], '${{ runner.temp }}/patchwork-codex')
        self.assertEqual(steps[agent]['env'], {'SENTRY_ACCESS_TOKEN':'${{ secrets.SENTRY_AUTH_TOKEN }}'})

if __name__ == '__main__':
    unittest.main()
