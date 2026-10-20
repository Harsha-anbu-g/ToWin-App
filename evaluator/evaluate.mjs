// Ask every case over A2A, embed reply and reference, score by cosine, report.
/** Remote text made safe for a terminal and a report: no control or escape characters, bounded length. */
export function clean(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').slice(0, max);
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export async function evaluate({ cases, discover, ask, embed, threshold = 0.6, log = () => {} }) {
  const { card, url } = await discover();
  const agent = clean(card.name, 80);
  log(`agent: ${agent} at ${clean(url, 200)}`);
  const rows = [];
  for (const c of cases) {
    let reply = null;
    try { reply = await ask(url, c.question); } catch (e) { log(`${c.id}: ${clean(e.message, 200)}`); }
    let score = 0;
    if (reply) {
      const [r, ref] = await embed([reply, c.reference]);
      score = Number(cosine(r, ref).toFixed(3));
    }
    rows.push({ id: c.id, question: c.question, reply: reply === null ? null : clean(reply), score, pass: score >= threshold });
    log(`${c.id.padEnd(16)} ${String(score).padEnd(6)} ${score >= threshold ? 'pass' : 'FAIL'}`);
  }
  const passed = rows.filter((r) => r.pass).length;
  return { agent, url: clean(url, 200), threshold, passed, total: rows.length, rows };
}

export function formatReport(report) {
  const lines = report.rows.map((r) => `${r.id.padEnd(16)} ${String(r.score).padEnd(6)} ${r.pass ? 'pass' : 'FAIL'}`);
  return [`${report.agent}: ${report.passed}/${report.total} at threshold ${report.threshold}`, ...lines].join('\n');
}
