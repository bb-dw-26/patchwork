import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { publishProposal, proposalTitle } from "../scripts/engine.mjs";

const config = { repository: 'example/testing', baseBranch: 'demo/chk-001', scenario: 'CHK-001', sourceFiles: ['src/orders.ts'], testPattern: '^test/[a-z0-9-]+\\.test\\.ts$' };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "bbdw-publish-test-"));
  t.after(() => {
    // Diretório temporário exclusivo deste teste, nunca o checkout do usuário.
    if (dirname(resolve(root)) !== resolve(tmpdir())) throw new Error("Diretório temporário fora do local esperado.");
    rmSync(root, { recursive: true, force: true });
  });
  const seed = join(root, "seed");
  const remote = join(root, "remote.git");
  const artifacts = join(root, "artifacts");
  mkdirSync(seed); mkdirSync(artifacts);
  const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git(seed, ["init", "-b", "main"]);
  git(seed, ["config", "core.autocrlf", "false"]);
  git(seed, ["config", "user.name", "Teste local"]);
  git(seed, ["config", "user.email", "test@example.invalid"]);
  mkdirSync(join(seed, "src")); mkdirSync(join(seed, "test"));
  writeFileSync(join(seed, "src/orders.ts"), "// versão defeituosa do teste de publicação\n");
  git(seed, ["add", "."]); git(seed, ["commit", "-m", "base sintética"]);
  const baseSha = git(seed, ["rev-parse", "HEAD"]);
  git(root, ["clone", "--bare", seed, remote]);
  writeFileSync(join(seed, "src/orders.ts"), "// proposta do teste de publicação\n");
  writeFileSync(join(seed, "test/pickup.test.ts"), "// teste sintético: nunca executado pelo publicador\n");
  git(seed, ["add", "."]);
  writeFileSync(join(artifacts, "candidate.patch"), execFileSync("git", ["diff", "--cached", "--binary"], { cwd: seed }));
  writeFileSync(join(artifacts, "report.md"), "Relatório sintético, sem agente real.");
  writeFileSync(join(artifacts, 'incident.json'), JSON.stringify({ issueTitle: 'TypeError ao consultar endereço', sentryShortId: 'CHECKOUT-7' }));
  writeFileSync(join(artifacts, "validation.md"), "Evidência sintética para testar apenas a publicação.");
  writeFileSync(join(artifacts, 'validation.json'), JSON.stringify({passed:true,baseSha,tree:git(seed,['write-tree'])}));
  let copies = 0;
  let createCalls = 0;
  let pr;
  let failCreation = true;
  let failComment = false;
  const comments = [];
  const prUrl = "https://github.com/example/testing/pull/1";
  const options = () => {
    const app = join(root, `app-${++copies}`);
    git(root, ["clone", "--config", "core.autocrlf=false", remote, app]);
    return {
      config, baseSha, number: "42", artifactDir: artifacts, runId: "1", summaryPath: join(root, "summary.md"),
      runGit: (args) => git(app, args),
      runGh(args, input) {
        if (args[0] === "pr") return pr ? [{ url: prUrl }] : [];
        if (args[1].includes("/git/ref/")) return { object: { sha: baseSha } };
        if (args[1].includes('/comments')) {
          if (!input) return [comments];
          if (failComment) throw new Error('Falha simulada no comentário');
          const comment = { ...JSON.parse(input), html_url: 'https://github.com/example/testing/issues/42#issuecomment-1',
            user: { id: 41898282, login: 'github-actions[bot]' } };
          comments.push(comment); return comment;
        }
        createCalls++;
        if (failCreation) throw new Error("Falha simulada depois do push");
        pr = JSON.parse(input);
        return { html_url: prUrl };
      },
    };
  };
  return { options, artifacts, git, remote, seed, prUrl,
    allowCreation() { failCreation = false; },
    setCommentFailure(value) { failComment = value; },
    comments,
    get pr() { return pr; }, get createCalls() { return createCalls; },
    head() { return git(remote, ["rev-parse", "refs/heads/agent/chk-001-issue-42"]); },
  };
}

test("retoma depois de push concluído sem duplicar commits ou PR", (t) => {
  const f = fixture(t);
  assert.throws(() => publishProposal(f.options()), /Falha simulada depois do push/);
  const originalHead = f.head();
  f.allowCreation();
  assert.equal(publishProposal(f.options()), f.prUrl);
  assert.equal(f.head(), originalHead);
  assert.equal(f.pr.draft, true);
  assert.equal(f.pr.title, 'fix: [CHECKOUT-7] TypeError ao consultar endereço (#42)');
  assert.equal(f.pr.base, "demo/chk-001");
  assert.equal(publishProposal(f.options()), f.prUrl);
  assert.equal(f.createCalls, 2);
  assert.equal(f.head(), originalHead);
  assert.equal(f.comments.length, 1);
  assert.ok(f.comments[0].body.includes(f.prUrl));
});

test('retoma comentário após PR criado sem publicar duas propostas', t => {
  const f = fixture(t); f.allowCreation(); f.setCommentFailure(true);
  assert.throws(() => publishProposal(f.options()), /Falha simulada no comentário/);
  const head = f.head();
  f.setCommentFailure(false);
  assert.equal(publishProposal(f.options()), f.prUrl);
  assert.equal(publishProposal(f.options()), f.prUrl);
  assert.equal(f.createCalls, 1);
  assert.equal(f.comments.length, 1);
  assert.equal(f.head(), head);
});

test("não sobrescreve branch remota com outra proposta", (t) => {
  const f = fixture(t);
  assert.throws(() => publishProposal(f.options()), /Falha simulada/);
  const originalHead = f.head();
  const options = f.options();
  // Simular intervenção posterior na branch com Git real e preservar esse commit.
  options.runGit(["fetch", "origin", "refs/heads/agent/chk-001-issue-42"]);
  options.runGit(["switch", "--detach", "FETCH_HEAD"]);
  options.runGit(["config", "user.name", "Teste local"]);
  options.runGit(["config", "user.email", "test@example.invalid"]);
  options.runGit(["commit", "--allow-empty", "-m", "intervenção posterior"]);
  options.runGit(["push", "origin", "HEAD:refs/heads/agent/chk-001-issue-42"]);
  const changedHead = f.head();
  assert.notEqual(changedHead, originalHead);
  assert.throws(() => publishProposal(f.options()), /outra proposta/);
  assert.equal(f.head(), changedHead);
  assert.equal(f.createCalls, 1);
});

test("artifact ausente falha antes de publicar branch", (t) => {
  const f = fixture(t);
  unlinkSync(join(f.artifacts, "report.md"));
  assert.throws(() => publishProposal(f.options()), /ENOENT/);
  assert.equal(f.git(f.remote, ["for-each-ref", "--format=%(refname)", "refs/heads/agent/"]), "");
  assert.equal(f.createCalls, 0);
});

test('título preserva identidade e trata texto como dados em uma linha limitada', () => {
  assert.equal(proposalTitle({ issueTitle: 'TypeError\n\treading trim', sentryShortId: 'BBDW-CHECKOUT-7' }, '4'),
    'fix: [BBDW-CHECKOUT-7] TypeError reading trim (#4)');
  const title = proposalTitle({ issueTitle: 'x'.repeat(500), sentryShortId: 'CHECKOUT-7' }, '42');
  assert.equal(title.length, 256);
  assert.ok(title.endsWith(' (#42)'));
  assert.throws(() => proposalTitle({ issueTitle: 'error', sentryShortId: 'invalid\ncode' }, '4'), /inválido/);
});
