// O publicador usa o relatório redigido após a validação da proposta; não executa código da proposta.
export function publishIssueSummary({ repository, number, prUrl, runId, report, runGh, publisherAppSlug }) {
  const marker = `<!-- patchwork:repair-summary:${number} -->`;
  const pages = runGh(['api', `repos/${repository}/issues/${number}/comments?per_page=100`, '--paginate', '--slurp']);
  const previous = pages.flat().find(comment => comment.body?.includes(marker) &&
    ((comment.user?.id === 41898282 && comment.user?.login === 'github-actions[bot]') ||
     (publisherAppSlug && comment.user?.type === 'Bot' && comment.user?.login === `${publisherAppSlug}[bot]` &&
      comment.performed_via_github_app?.slug === publisherAppSlug)));
  if (previous) return previous.html_url;
  const brief = report.trim().split(/\r?\n\s*\r?\n/).slice(0, 2).join('\n\n')
    .replace(/<!--[\s\S]*?-->/g, '').replaceAll('@', '@\u200b').slice(0, 1400);
  const body = `${marker}\n**Resumo do diagnóstico**\n\n${brief}\n\n` +
    `Validação: a regressão falhou no código original e as verificações passaram com a correção.\n\n` +
    `[PR para revisão](${prUrl}) · [Execução e evidências](https://github.com/${repository}/actions/runs/${runId})\n\n` +
    'A correção aguarda revisão; ainda não foi aplicada à branch principal.';
  return runGh(['api', `repos/${repository}/issues/${number}/comments`, '--method', 'POST', '--input', '-'], JSON.stringify({ body })).html_url;
}
