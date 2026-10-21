import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fixture(t, runtime, alreadyFixed = false) {
  const dir = mkdtempSync(resolve(tmpdir(), 'patchwork-integration-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const app = resolve(dir, 'app'), automation = resolve(dir, 'automation'), artifacts = resolve(dir, 'artifacts');
  [app, automation, artifacts].forEach(p => mkdirSync(p));
  const put = (name, text) => { const p = resolve(app, name); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
  const git = args => execFileSync('git', args, { cwd: app, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
  put('.gitignore', 'node_modules/\ndist/\ntest-results/\n');
  let source, testPath, broken, fixed, regression;
  if (runtime === 'go') {
    source='answer.go'; testPath='patchwork_answer_test.go';
    put('go.mod', 'module example/answer\n\ngo 1.23\n');
    broken='package answer\n\nfunc Answer() int { return 1 }\n'; fixed=broken.replace('return 1','return 2');
    regression='package answer\n\nimport "testing"\n\nfunc TestPatchworkAnswer(t *testing.T) {\n\tif Answer() != 2 {\n\t\tt.Fatal("expected 2")\n\t}\n}\n';
  } else if (runtime === 'node') {
    source='src/answer.ts'; testPath='test/patchwork-answer.test.ts';
    broken='export const answer = () => 1;\n'; fixed=broken.replace('=> 1','=> 2');
    put('package.json', JSON.stringify({ type:'module', scripts:{ build:'node build.mjs', check:'node build.mjs && node --test dist/test/*.test.js' } }));
    put('build.mjs', `import { readdirSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
for (const dir of ['src','test']) { mkdirSync('dist/'+dir,{recursive:true}); if (!existsSync(dir)) continue; for (const file of readdirSync(dir)) writeFileSync('dist/'+dir+'/'+file.replace(/\\.ts$/,'.js'),readFileSync(dir+'/'+file)); }`);
    regression="import { test } from 'node:test'; import assert from 'node:assert/strict'; import { answer } from '../src/answer.js'; test('answer',()=>assert.equal(answer(),2));\n";
  } else {
    source='src/answer.ts'; testPath='tests/patchwork-answer.spec.ts';
    broken="export const markup = '<h1>wrong</h1>';\n"; fixed=broken.replace('wrong','correct');
    put('package.json', JSON.stringify({type:'module', scripts:{typecheck:'node --check src/answer.ts',check:'playwright test --workers=1 --retries=0'}}));
    put('playwright.config.ts', "export default { testDir: './tests', use: { browserName: 'chromium' } };\n");
    symlinkSync(resolve(root,'node_modules'),resolve(app,'node_modules'),'junction');
    regression="import {test,expect} from '@playwright/test'; import {markup} from '../src/answer'; test('render',async({page})=>{await page.setContent(markup); await expect(page.locator('h1')).toHaveText('correct',{timeout:300});});\n";
  }
  put(source, alreadyFixed ? fixed : broken);
  git(['init','-b','main']); git(['config','core.autocrlf','false']); git(['config','user.name','Patchwork test']); git(['config','user.email','test@example.invalid']);
  git(['add','.']); git(['commit','-m','fixture']); const sha=git(['rev-parse','HEAD']);
  put(source, alreadyFixed ? fixed+'\n' : fixed); put(testPath,regression);
  git(['add','.']);
  writeFileSync(resolve(artifacts,'candidate.patch'),execFileSync('git',['diff','--cached','--binary'],{cwd:app}));
  git(['reset','--hard','HEAD']);
  writeFileSync(resolve(automation,'config.json'),JSON.stringify({ repository:'example/answer',baseBranch:'main',runtime,sentry:{org:'example',project:'answer',projectId:'123'},sourceFiles:[source],testPattern:'^'+testPath.replaceAll('.','\\.')+'$' }));
  return { dir, artifacts, sha };
}

for (const runtime of ['node','go','playwright']) {
  test(`${runtime}: regressão real falha antes e passa depois`, { skip: runtime === 'go' && process.platform === 'win32' ? 'Go -race requer compilador C; coberto pelo CI Linux.' : false }, t => {
    const f=fixture(t,runtime);
    const result=spawnSync(process.execPath,[resolve(root,'scripts/engine.mjs'),'validate'],{cwd:f.dir,env:{...process.env,NODE_TEST_CONTEXT:undefined,PATCHWORK_CONFIG:'config.json',RUNNER_TEMP:f.artifacts,BASE_SHA:f.sha},encoding:'utf8',timeout:240000});
    const log = resolve(f.artifacts,'regression-before.log');
    assert.equal(result.status,0,result.stdout+'\n'+result.stderr+'\n'+(existsSync(log) ? readFileSync(log,'utf8') : ''));
    assert.equal(JSON.parse(readFileSync(resolve(f.artifacts,'validation.json'),'utf8')).passed,true);
  });
}
test('teste que já passa antes não gera aprovação', t => {
  const f=fixture(t,'node',true);
  const result=spawnSync(process.execPath,[resolve(root,'scripts/engine.mjs'),'validate'],{cwd:f.dir,env:{...process.env,NODE_TEST_CONTEXT:undefined,PATCHWORK_CONFIG:'config.json',RUNNER_TEMP:f.artifacts,BASE_SHA:f.sha},encoding:'utf8',timeout:30000});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/deve falhar antes/);
});
