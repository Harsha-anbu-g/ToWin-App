// Ask every case over A2A, embed reply and reference, score by cosine, report.
export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export async function evaluate({ cases, discover, ask, embed, threshold = 0.6, log = () => {} }) {
  const { card, url } = await discover();
  log(`agent: ${card.name} at ${url}`);
  const rows = [];
  for (const c of cases) {
    let reply = null;
    try { reply = await ask(url, c.question); } catch (e) { log(`${c.id}: ${e.message}`); }
    let score = 0;
    if (reply) {
      const [r, ref] = await embed([reply, c.reference]);
      score = Number(cosine(r, ref).toFixed(3));
    }
    rows.push({ id: c.id, question: c.question, reply, score, pass: score >= threshold });
    log(`${c.id.padEnd(16)} ${String(score).padEnd(6)} ${score >= threshold ? 'pass' : 'FAIL'}`);
  }
  const passed = rows.filter((r) => r.pass).length;
  return { agent: card.name, url, threshold, passed, total: rows.length, rows };
}

export function formatReport(report) {
  const lines = report.rows.map((r) => `${r.id.padEnd(16)} ${String(r.score).padEnd(6)} ${r.pass ? 'pass' : 'FAIL'}`);
  return [`${report.agent}: ${report.passed}/${report.total} at threshold ${report.threshold}`, ...lines].join('\n');
}
