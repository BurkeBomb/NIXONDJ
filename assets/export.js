function escapeHtml(s="") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileSafeDate(dateStr){
  return (dateStr || "entry").replaceAll(":", "-");
}

export function toMarkdown(entry){
  const lines = [];
  lines.push(`# ${entry.headline?.trim() ? entry.headline.trim() : "Journal Entry"}`);
  lines.push(`**Date:** ${entry.date}`);
  lines.push(`**Mood:** ${entry.mood ?? ""}/10`);
  lines.push("");
  if (entry.items?.length){
    entry.items.forEach((it, idx) => {
      const p = (it.prompt || "").trim();
      const a = (it.answer || "").trim();
      lines.push(`## Prompt ${idx+1}`);
      if (p) lines.push(p);
      lines.push("");
      lines.push(a ? a : "_(no response)_");
      lines.push("");
    });
  }
  if ((entry.freeWrite || "").trim()){
    lines.push("## Free write");
    lines.push(entry.freeWrite.trim());
    lines.push("");
  }
  if ((entry.highlights || "").trim()){
    lines.push("## Highlights");
    lines.push(entry.highlights.trim());
    lines.push("");
  }
  if ((entry.gratitude || "").trim()){
    lines.push("## Gratitude");
    lines.push(entry.gratitude.trim());
    lines.push("");
  }
  return lines.join("\n");
}

export function toHtml(entry){
  const title = entry.headline?.trim() ? entry.headline.trim() : "Journal Entry";
  const itemsHtml = (entry.items || []).map((it, idx) => {
    const p = escapeHtml((it.prompt || "").trim());
    const a = escapeHtml((it.answer || "").trim());
    return `
      <section class="block">
        <div class="kicker">Prompt ${idx+1}</div>
        <div class="prompt">${p || ""}</div>
        <div class="answer">${(a || "").replaceAll("\n","<br/>") || "<em>(no response)</em>"}</div>
      </section>
    `;
  }).join("");

  const free = escapeHtml((entry.freeWrite || "").trim()).replaceAll("\n","<br/>");
  const highlights = escapeHtml((entry.highlights || "").trim()).replaceAll("\n","<br/>");
  const gratitude = escapeHtml((entry.gratitude || "").trim()).replaceAll("\n","<br/>");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)} — ${escapeHtml(entry.date)}</title>
<style>
  :root{
    --bg:#0B0D10;--surface:#12161c;--ink:#e9edf2;--muted:rgba(233,237,242,.68);--border:rgba(233,237,242,.10);
    --accent:#1FE3D2;--shadow:0 18px 55px rgba(0,0,0,.55);
    --serif: ui-serif, Georgia, "Times New Roman", serif;
    --sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }
  body{margin:0;font-family:var(--sans);color:var(--ink);background:radial-gradient(1100px 700px at 20% 0%, rgba(31,227,210,.10), transparent 58%), radial-gradient(900px 600px at 100% 10%, rgba(10,165,178,.10), transparent 55%), linear-gradient(180deg,#07080a,var(--bg));}
  .page{max-width:900px;margin:24px auto;padding:0 16px;}
  .card{background:linear-gradient(180deg, rgba(18,22,28,.92), rgba(18,22,28,.82));border:1px solid rgba(233,237,242,.10);border-radius:18px;box-shadow:var(--shadow);padding:22px;}
  h1{margin:0;font-family:var(--serif);letter-spacing:.2px;}
  .meta{margin-top:8px;color:var(--muted);font-family:var(--mono);font-size:12px;display:flex;gap:12px;flex-wrap:wrap}
  .pill{border:1px solid rgba(224,218,209,.95);border-radius:999px;padding:6px 10px;background:linear-gradient(135deg, rgba(242,244,247,.80), rgba(200,204,211,.55)), repeating-linear-gradient(90deg, rgba(255,255,255,.10) 0, rgba(255,255,255,.10) 2px, rgba(0,0,0,.02) 6px)}
  .block{margin-top:16px;padding-top:14px;border-top:1px solid rgba(222,216,207,.85)}
  .kicker{color:var(--muted);text-transform:uppercase;letter-spacing:.22px;font-size:12px}
  .prompt{margin-top:6px;color:var(--accent);font-weight:700}
  .answer{margin-top:10px;line-height:1.55}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
  .box{border:1px solid rgba(224,218,209,.95);border-radius:14px;padding:12px;background:rgba(255,255,255,.70)}
  .box h3{margin:0 0 6px 0;font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:.2px}
  @media (max-width:820px){.two{grid-template-columns:1fr}}
</style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">
        <span class="pill">Date: ${escapeHtml(entry.date)}</span>
        <span class="pill">Mood: ${escapeHtml(String(entry.mood ?? ""))}/10</span>
      </div>
      ${itemsHtml}
      ${(free ? `<section class="block"><div class="kicker">Free write</div><div class="answer">${free}</div></section>` : "")}
      <div class="two">
        ${(highlights ? `<div class="box"><h3>Highlights</h3><div class="answer">${highlights}</div></div>` : "")}
        ${(gratitude ? `<div class="box"><h3>Gratitude</h3><div class="answer">${gratitude}</div></div>` : "")}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadText(filename, text, mime="text/plain;charset=utf-8"){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename, obj){
  downloadText(filename, JSON.stringify(obj, null, 2), "application/json;charset=utf-8");
}

export function exportEntryFiles(entry){
  const date = fileSafeDate(entry.date);
  return {
    html: { filename: `journal-${date}.html`, text: toHtml(entry), mime: "text/html;charset=utf-8" },
    md: { filename: `journal-${date}.md`, text: toMarkdown(entry), mime: "text/markdown;charset=utf-8" },
    json: { filename: `journal-${date}.json`, text: JSON.stringify(entry, null, 2), mime: "application/json;charset=utf-8" },
  };
}

export function buildAllEntriesHtmlIndex(entries){
  const rows = entries.map(e => {
    const title = (e.headline || "").trim() || "Journal Entry";
    return `<li>
      <a href="entries/journal-${escapeHtml(e.date)}.html">` +
      `<span class="d">${escapeHtml(e.date)}</span>` +
      `<span class="t">${escapeHtml(title)}</span>` +
      `</a>
    </li>`;
  }).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Journal Export</title>
<style>
  body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:#0b0d10;color:#e9edf2}
  .wrap{max-width:900px;margin:24px auto;padding:0 16px}
  .card{background:linear-gradient(180deg, rgba(18,22,28,.92), rgba(18,22,28,.82));border:1px solid rgba(233,237,242,.10);border-radius:18px;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.55)}
  h1{margin:0 0 12px 0;font-family:ui-serif,Georgia,"Times New Roman",serif;color:#e9edf2}
  ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}
  a{display:flex;gap:12px;align-items:center;padding:12px 12px;border:1px solid rgba(233,237,242,.10);border-radius:14px;text-decoration:none;color:inherit;background:rgba(23,28,36,.62)}
  .d{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;font-size:12px;color:#5c616a;min-width:110px}
  .t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Journal Export</h1>
      <p style="margin-top:0;color:rgba(233,237,242,.68)">Open an entry to view the exported HTML snapshot.</p>
      <ul>${rows}</ul>
    </div>
  </div>
</body>
</html>`;
}
