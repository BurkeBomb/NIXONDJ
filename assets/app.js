import { getEntry, putEntry, deleteEntry, listEntries } from "./db.js";
import { exportEntryFiles, downloadText, downloadJson, buildAllEntriesHtmlIndex, toHtml } from "./export.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const entryDate = $("#entryDate");
const saveStatus = $("#saveStatus");

const promptList = $("#promptList");
const tpl = $("#promptItemTpl");

const headline = $("#headline");
const mood = $("#mood");
const highlights = $("#highlights");
const gratitude = $("#gratitude");
const freeWrite = $("#freeWrite");

const exportModal = $("#exportModal");
const historyModal = $("#historyModal");
const helpModal = $("#helpModal");
const templatesModal = $("#templatesModal");
const editorModal = $("#editorModal");
const editorTitle = $("#editorTitle");
const editorPrompt = $("#editorPrompt");
const editorAnswer = $("#editorAnswer");
let editorIdx = -1;
let editorRefs = null;

const historyListEl = $("#historyList");
const historySearch = $("#historySearch");

let currentDate = todayStr();
let currentEntry = blankEntry(currentDate);
let saveTimer = null;
let isDirty = false;

function todayStr(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function addDays(dateStr, delta){
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function blankEntry(date){
  return {
    date,
    headline: "",
    mood: 6,
    items: [
      { prompt: "", answer: "" }
    ],
    freeWrite: "",
    highlights: "",
    gratitude: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}


function autoGrow(t){
  if(!t) return;
  t.style.height = "auto";
  const max = 520;
  t.style.height = Math.min(t.scrollHeight, max) + "px";
}

function setStatus(text){
  saveStatus.textContent = text;
}

function markDirty(){
  isDirty = true;
  setStatus("Editing…");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 500);
}

async function saveNow(){
  if (!isDirty) return;
  isDirty = false;
  setStatus("Saving…");
  currentEntry.updatedAt = new Date().toISOString();
  await putEntry(currentEntry);
  setStatus("Saved • " + new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}));
}

function renderPrompts(){
  promptList.innerHTML = "";
  currentEntry.items = currentEntry.items && currentEntry.items.length ? currentEntry.items : [{prompt:"", answer:""}];

  currentEntry.items.forEach((it, idx) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".promptNum").textContent = `Item ${idx+1}`;
    const p = node.querySelector(".promptText");
    const a = node.querySelector(".promptAnswer");
    const rm = node.querySelector(".removeBtn");
    const ex = node.querySelector(".expandBtn");

    p.value = it.prompt ?? "";
    a.value = it.answer ?? "";

    autoGrow(p);
    autoGrow(a);

    p.addEventListener("input", () => {
      currentEntry.items[idx].prompt = p.value;
      autoGrow(p);
      markDirty();
    });
    a.addEventListener("input", () => {
      currentEntry.items[idx].answer = a.value;
      autoGrow(a);
      markDirty();
    });

    ex.addEventListener("click", () => openEditor(idx, p, a));

    rm.addEventListener("click", () => {
      if (currentEntry.items.length === 1){
        currentEntry.items[0] = { prompt:"", answer:"" };
      } else {
        currentEntry.items.splice(idx, 1);
      }
      markDirty();
      renderPrompts();
    });

    promptList.appendChild(node);
  });
}

function bindFields(){
  headline.addEventListener("input", () => { currentEntry.headline = headline.value; markDirty(); });
  mood.addEventListener("input", () => { currentEntry.mood = Number(mood.value); markDirty(); });
  highlights.addEventListener("input", () => { currentEntry.highlights = highlights.value; markDirty(); });
  gratitude.addEventListener("input", () => { currentEntry.gratitude = gratitude.value; markDirty(); });
  freeWrite.addEventListener("input", () => { currentEntry.freeWrite = freeWrite.value; markDirty(); });

  $$(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const ins = chip.getAttribute("data-insert") || "";
      insertAtCursor(highlights, ins);
      currentEntry.highlights = highlights.value;
      markDirty();
    });
  });
}

function insertAtCursor(el, text){
  el.focus();
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0,start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.setSelectionRange(pos, pos);
}

function applyEntryToUI(){
  entryDate.value = currentEntry.date;
  headline.value = currentEntry.headline ?? "";
  mood.value = String(currentEntry.mood ?? 6);
  highlights.value = currentEntry.highlights ?? "";
  gratitude.value = currentEntry.gratitude ?? "";
  freeWrite.value = currentEntry.freeWrite ?? "";
  renderPrompts();
}

async function loadDate(dateStr){
  await saveNow();
  currentDate = dateStr;
  const found = await getEntry(dateStr);
  currentEntry = found ? normalizeEntry(found) : blankEntry(dateStr);
  applyEntryToUI();
  setStatus(found ? "Loaded" : "New entry");
}

function normalizeEntry(e){
  // Defensive: ensure fields exist
  const base = blankEntry(e.date || todayStr());
  return {
    ...base,
    ...e,
    items: Array.isArray(e.items) && e.items.length ? e.items.map(x => ({prompt: x.prompt ?? "", answer: x.answer ?? ""})) : base.items,
    mood: typeof e.mood === "number" ? e.mood : Number(e.mood ?? base.mood)
  };
}

function openModal(el){ el.classList.remove("hidden"); }
function closeModal(el){ el.classList.add("hidden"); }

function closeAllModals(){
  [exportModal, historyModal, templatesModal, helpModal, editorModal].forEach(closeModal);
}

function setupModals(){
  $("#exportBtn").addEventListener("click", () => openModal(exportModal));
  $("#closeExport").addEventListener("click", () => closeModal(exportModal));
  $("#historyBtn").addEventListener("click", async () => { await refreshHistory(); openModal(historyModal); });
  $("#closeHistory").addEventListener("click", () => closeModal(historyModal));
  $("#templatesBtn").addEventListener("click", () => openModal(templatesModal));
  $("#closeTemplates").addEventListener("click", () => closeModal(templatesModal));
  $("#helpBtn").addEventListener("click", () => openModal(helpModal));
  $("#closeHelp").addEventListener("click", () => closeModal(helpModal));

  $("#closeEditor").addEventListener("click", () => closeEditor());

  [exportModal, historyModal, templatesModal, helpModal, editorModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}


function openEditor(idx, promptEl, answerEl){
  editorIdx = idx;
  editorRefs = { promptEl, answerEl };
  editorTitle.textContent = `Edit Item ${idx+1}`;
  editorPrompt.value = currentEntry.items[idx].prompt ?? "";
  editorAnswer.value = currentEntry.items[idx].answer ?? "";
  autoGrow(editorPrompt);
  autoGrow(editorAnswer);
  openModal(editorModal);

  editorPrompt.oninput = () => {
    currentEntry.items[editorIdx].prompt = editorPrompt.value;
    if (editorRefs?.promptEl){ editorRefs.promptEl.value = editorPrompt.value; autoGrow(editorRefs.promptEl); }
    autoGrow(editorPrompt);
    markDirty();
  };
  editorAnswer.oninput = () => {
    currentEntry.items[editorIdx].answer = editorAnswer.value;
    if (editorRefs?.answerEl){ editorRefs.answerEl.value = editorAnswer.value; autoGrow(editorRefs.answerEl); }
    autoGrow(editorAnswer);
    markDirty();
  };
}

function closeEditor(){
  editorIdx = -1;
  editorRefs = null;
  editorPrompt.oninput = null;
  editorAnswer.oninput = null;
  closeModal(editorModal);
}

function setupDateControls(){
  entryDate.value = currentDate;
  entryDate.addEventListener("change", () => loadDate(entryDate.value));
  $("#prevDay").addEventListener("click", () => loadDate(addDays(currentDate, -1)));
  $("#nextDay").addEventListener("click", () => loadDate(addDays(currentDate, +1)));
}

function setupPromptButtons(){
  $("#addPromptBtn").addEventListener("click", () => {
    currentEntry.items.push({ prompt: "", answer: "" });
    markDirty();
    renderPrompts();
  });

  $("#clearTodayBtn").addEventListener("click", async () => {
    const ok = confirm("Clear today's entry? This only clears locally stored content for this date.");
    if (!ok) return;
    await deleteEntry(currentDate);
    currentEntry = blankEntry(currentDate);
    applyEntryToUI();
    setStatus("Cleared");
  });
}

function setupExport(){
  $("#printBtn").addEventListener("click", async () => {
    await saveNow();
    window.print();
  });

  $("#backupBtn").addEventListener("click", async () => {
    await saveNow();
    const all = await listEntries();
    downloadJson(`journal-backup-all.json`, { exportedAt: new Date().toISOString(), entries: all });
  });

  $("#exportHtml").addEventListener("click", async () => {
    await saveNow();
    const files = exportEntryFiles(currentEntry);
    downloadText(files.html.filename, files.html.text, files.html.mime);
  });
  $("#exportMd").addEventListener("click", async () => {
    await saveNow();
    const files = exportEntryFiles(currentEntry);
    downloadText(files.md.filename, files.md.text, files.md.mime);
  });
  $("#exportJson").addEventListener("click", async () => {
    await saveNow();
    const files = exportEntryFiles(currentEntry);
    downloadText(files.json.filename, files.json.text, files.json.mime);
  });

  $("#shareBtn").addEventListener("click", async () => {
    await saveNow();
    const files = exportEntryFiles(currentEntry);
    const htmlBlob = new Blob([files.html.text], { type: files.html.mime });
    const mdBlob = new Blob([files.md.text], { type: files.md.mime });
    const canFiles = !!(navigator.canShare && navigator.canShare({ files: [new File([htmlBlob], files.html.filename)] }));

    try{
      if (navigator.share && canFiles){
        await navigator.share({
          title: "Journal Entry",
          text: (currentEntry.headline || "").trim() || "Journal Entry",
          files: [
            new File([htmlBlob], files.html.filename, { type: files.html.mime }),
            new File([mdBlob], files.md.filename, { type: files.md.mime })
          ]
        });
      } else if (navigator.share){
        await navigator.share({
          title: "Journal Entry",
          text: files.md.text.slice(0, 7000) // keep it sane
        });
      } else {
        alert("Sharing isn't supported on this browser. Use Export buttons to download files instead.");
      }
    } catch(err){
      // user cancels -> ignore
    }
  });

  $("#applyPromptPaste").addEventListener("click", () => {
    const raw = $("#promptPaste").value || "";
    const prompts = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!prompts.length) return;
    currentEntry.items = prompts.map(p => ({ prompt: p, answer: "" }));
    $("#promptPaste").value = "";
    markDirty();
    renderPrompts();
    closeModal(exportModal);
  });

  $("#exportAllHtml").addEventListener("click", async () => {
    await saveNow();
    const all = await listEntries();
    // We'll export a single index.html plus individual entry HTMLs as separate downloads.
    // Browser cannot zip without extra deps; we keep it simple: download index + offer a bulk prompt.
    const indexHtml = buildAllEntriesHtmlIndex(all);
    downloadText("journal-export-index.html", indexHtml, "text/html;charset=utf-8");

    // Also download each entry html (user will get multiple downloads; browser may ask permission)
    const ok = confirm("Download HTML for every saved entry as separate files too? (This may trigger many downloads.)");
    if (!ok) return;
    for (const e of all){
      const html = toHtml(e);
      downloadText(`journal-${e.date}.html`, html, "text/html;charset=utf-8");
      await new Promise(r => setTimeout(r, 80));
    }
  });
}

async function refreshHistory(){
  const all = await listEntries();
  renderHistory(all, historySearch.value || "");
}

function renderHistory(entries, query){
  const q = (query || "").trim().toLowerCase();
  const filtered = !q ? entries : entries.filter(e => {
    const blob = [
      e.date,
      e.headline,
      e.highlights,
      e.gratitude,
      e.freeWrite,
      ...(e.items || []).flatMap(it => [it.prompt, it.answer])
    ].join("\n").toLowerCase();
    return blob.includes(q);
  });

  historyListEl.innerHTML = "";
  if (!filtered.length){
    historyListEl.innerHTML = `<div class="hint">No matches.</div>`;
    return;
  }

  filtered.forEach(e => {
    const row = document.createElement("div");
    row.className = "historyRow";
    const title = (e.headline || "").trim() || "—";
    row.innerHTML = `
      <div class="historyMeta">
        <div class="historyDate">${e.date}</div>
        <div class="historyTitle">${escapeHtml(title)}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btnMetal" data-open="${e.date}">Open</button>
        <button class="btn" data-export="${e.date}">Export</button>
      </div>
    `;
    historyListEl.appendChild(row);
  });

  historyListEl.querySelectorAll("button[data-open]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const d = btn.getAttribute("data-open");
      closeModal(historyModal);
      await loadDate(d);
    });
  });

  historyListEl.querySelectorAll("button[data-export]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const d = btn.getAttribute("data-export");
      const e = await getEntry(d);
      if (!e) return;
      const files = exportEntryFiles(e);
      downloadText(files.html.filename, files.html.text, files.html.mime);
    });
  });
}

function escapeHtml(s=""){
  return (s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setupHistorySearch(){
  historySearch.addEventListener("input", async () => {
    const all = await listEntries();
    renderHistory(all, historySearch.value || "");
  });
}

function setupServiceWorker(){
  if ("serviceWorker" in navigator){
    window.addEventListener("load", async () => {
      try{
        await navigator.serviceWorker.register("./sw.js");
      } catch(e){ /* ignore */ }
    });
  }
}

async 
function applyTemplateBlank(){
  const isSingleEmpty = currentEntry.items.length === 1 && !(currentEntry.items[0].prompt || "").trim() && !(currentEntry.items[0].answer || "").trim();
  if(isSingleEmpty){
    currentEntry.items = [{prompt:"", answer:""}];
  } else {
    currentEntry.items.push({prompt:"", answer:""});
  }
  markDirty();
  renderAll();
}

function applyTemplateDay1(){
  const full = "The man who came home to himself!\n\nYou didn\u2019t \u201cbecome\u201d gay later in life. You became honest later in life.\n\nFor years you did what good men do. You showed up, you provided and stayed loyal to the life you built. You tried to make it fit because you had vows, responsibilities, kids, a family name and a version of you that knew how to survive by being \u201cfine.\u201d\n\nAnd then one day the pretending got heavier than the truth.\n\nSo you did the thing most men are terrified to do\u2026\u2026..\n\nYou chose yourself.\n\nNot selfishly, not recklessly and definitely not to destroy anyone.\n\nBut because you finally realized that you can\u2019t teach your children to live truthfully while you live as a shadow.\n\nNow you\u2019re here.\n\nBetween who you were and who you are.\nBetween the life that looked right and the life that feels right. Between guilt and freedom. Between \u201cI\u2019m sorry\u201d and \u201cI\u2019m done hiding.\u201d\n\nIf you feel lost, good. Lost is what happens when you stop lying to survive.\n\nThis journal isn\u2019t here to fix you. You\u2019re not broken. You\u2019re not sinful. You\u2019re not a failure.\n\nYou\u2019re a man in the middle of a homecoming.\n\nWhat this journal is\n\nThis is a story journal because that\u2019s what your life is right now, a chapter turning.\n\nEvery day is a chapter. Every chapter peels one layer. Every chapter makes you trade. \n\nLet go of something \u2192 Gain something\n\nNot as a quote. As a decision.\n\nYou don\u2019t gain peace while gripping guilt. You don\u2019t gain freedom while feeding shame. You don\u2019t gain love while abandoning yourself.\n\nSo we don\u2019t rush.\n\nWe rebuild.\n\nWhat you\u2019re allowed to be here\n\nYou are allowed to be. \n\n\u2022 devastated\n\u2022 relieved\n\u2022 angry\n\u2022 tender\n\u2022 proud\n\u2022 terrified\n\u2022 lonely\n\u2022 hopeful\n\u2022 horny\n\u2022 holy\n\u2022 messy\n\u2022 real\n\nThis journal is not polite.\n\nBecause polite is how men disappear.\n\nThis is where you tell the truth without performing, without explaining and without begging to be understood.\n\nThe NIXON Rule\n\nIf it\u2019s neat, it\u2019s probably not honest yet. If it stings, you\u2019re close. If you\u2019re scared to write it, that\u2019s the door.\n\nWrite like your life depends on it because parts of you do.\n\nWhat this will change\n\nBy Day 30 you won\u2019t be \u201cfinished.\u201d\n\nBut you will be something better\u2026\u2026unhidden.\n\nYou\u2019ll stop treating your truth like a crime scene. You\u2019ll stop needing permission to exist. You\u2019ll learn how to love your kids without hating yourself. You\u2019ll learn how to grieve without crawling back into the closet. You\u2019ll start building a life that fits your skin.\n\nAnd near the end, you\u2019ll write a letter to your younger self, the boy who learned early that being himself could cost him love.\n\nYou\u2019ll tell him what you needed your whole life. \n\nIt\u2019s okay to be you.\nIt\u2019s okay to be gay.\nYou are not late.\nYou are not wrong.\nYou are not a mistake.\nYou are a man who came home to himself.\n\nStart here (right now)\n\nTop of the first page. No thinking.\n\n\u201cRight now, I am\u2026\u2026..\u201d\n\nXan - \n\nThen keep writing until you hit the truth.\n\nNIXON \ud83d\udda4\n\nDAY 1 \n\nIt starts the same way it always does, your eyes open, your brain reaches for the old script and then it remembers.\n\nNot in a dramatic movie way. In a stupid, ordinary way.\n\nLike standing in front of the kettle, staring at it as if it\u2019s about to give you instructions. Like opening WhatsApp, then closing it, then opening it again because your thumb is searching for a version of life where you\u2019re still \u201cthe husband\u201d and none of this happened.\nLike checking your phone even though you already know what you\u2019ll find \u2014 silence, noise or maybe even both.\n\nAnd the worst part? Your body doesn\u2019t know which emotion to pick so it chooses all of them.\n\nYour chest feels bruised. Your stomach feels hollow. Your head is busy writing arguments you\u2019ll never say out loud and somewhere under all of that is this inconvenient truth that keeps showing up like a grin you didn\u2019t ask for\u2026\u2026\n\nYou\u2019re free.\n\nNot \u201chappy free.\u201d Not \u201ceverything is perfect\u201d free. More like the cage door is open and you don\u2019t know where to put your hands free.\n\nBecause you didn\u2019t just leave a marriage. You left a role.\n\nA role that came with predictable days, predictable problems, predictable identity. A role where you could be tired and still feel \u201cknown,\u201d even if you weren\u2019t fully seen. A role where you could tell yourself at least I\u2019m doing the right thing.\n\nAnd now the right thing is, you.\nMessy, horny, grieving, relieved, ashamed, excited, terrified \u2014 all in one body.\n\nYou look at yourself today and it\u2019s like meeting a man you\u2019ve heard rumours about. The man who wanted to live honestly. The man who wanted to be touched and chosen without pretending.\nThe man who wanted to stop feeling like he\u2019s acting in his own life.\n\nAnd you can already feel where this story is going because you know yourself.\n\nYou know the patterns.\n\nYou know how you\u2019ll want to cope by numbing, by scrolling, by hooking up, by chasing attention, by trying to \u201cwin\u201d the breakup, by being strong and silent and calling it maturity.\n\nYou know the voice that will show up later tonight, when the house goes quiet and you\u2019re alone with your thoughts:\n\n\u201cWhat if I ruined everything?\u201d\n\u201cWhat if I\u2019m too late?\u201d\n\u201cWhat if no one really wants me \u2014 only the idea of me?\u201d\n\u201cWhat if I\u2019m just not built for love?\u201d\n\nThat\u2019s why this journal starts here.\nNot with a glow up.\nWith a truth.\n\nBecause today isn\u2019t about feeling better. Today is about stopping the performance long enough to meet the real you without flinching.\n\nThe Layer Today\n\nThe performance. The \u201cI\u2019m fine.\u201d The \u201cI\u2019m strong.\u201d The \u201cI don\u2019t need anyone.\u201d The \u201cI\u2019m not affected.\u201d The persona you used to survive.\n\nLet Go \u2192 Gain\n\nLet go of acting okay \u2192 Gain permission to be real.\n\nGuided Questions (write like nobody\u2019s watching)\n\n1. What\u2019s the first honest thought I had this morning before I edited it?\nWrite it exactly as it came.\n\n2. What am I actually grieving?\nNot just a person. List the roles: husband, routine, identity, certainty, the \u201cnormal life,\u201d the image.\n\n3. What am I secretly relieved about?\nThe thing you feel guilty for feeling relieved about.\n\n4. What am I craving most right now \u2014 comfort, sex, validation, or safety?\nDon\u2019t judge it. Name it.\nThen write: \u201cI usually chase this when I feel\u2026\u201d\n\n5. What is shame saying to me today?\nWrite the shame sentence in full. No softening.\n\n6. Now answer shame like a man who protects himself.\nIf your younger self heard that shame sentence, what would you say back?\n\n7. Where am I most likely to self sabotage tonight?\nBe brutally honest \u2014 messages, apps, alcohol, spiralling, isolation, revenge, emotional begging.\n\n8. What would choosing myself today look like in one small, boring, powerful way?\n(Boring is good. Boring means stable.)\n\n9. What do I want my kids to feel from me today even if they don\u2019t understand everything?\nOne word. Build around it.\n\nMicro-Action\n\nTonight before bed \u2014 do this like it\u2019s a ritual.\n\nWrite a \u201ctruth receipt\u201d page.\n\nThree lines only.\n\n\u2022 Today I\u2019m not okay with\u2026\n\u2022 Today I\u2019m proud of myself for\u2026\n\u2022 Today I choose myself by\u2026\n\nThen put your phone down. Not as punishment. As respect.\n\nKey Takeaway\n\nToday I let go of performing strength. I gain something rarer, honesty.\nThis is how I start coming home one truth at a time.\n\nNIXON \ud83d\udda4\n";
  const items = [
    { prompt: full, answer: "" },
  ];

  currentEntry.headline = currentEntry.headline || "DAY 1 — Homecoming";
  const isSingleEmpty = currentEntry.items.length === 1 && !(currentEntry.items[0].prompt || "").trim() && !(currentEntry.items[0].answer || "").trim();
  if(isSingleEmpty){
    currentEntry.items = items;
  } else {
    currentEntry.items.push(...items);
  }
  markDirty();
  renderAll();
}

function setupTemplates(){
  $("#tplDay1").addEventListener("click", () => {
    applyTemplateDay1();
    closeModal(templatesModal);
  });
  $("#tplBlank").addEventListener("click", () => {
    applyTemplateBlank();
    closeModal(templatesModal);
  });
}

function init(){
  setupDateControls();
  bindFields();
  setupPromptButtons();
  setupExport();
  setupModals();
  setupTemplates();
  setupHistorySearch();
  setupServiceWorker();

  await loadDate(currentDate);
}

init();

// Auto-reload when a new service worker activates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// If an update is found, ask it to activate immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (!reg) return;
    try { reg.update(); } catch (e) {}
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          try { nw.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
        }
      });
    });
  });
}
