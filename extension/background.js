const HOST = "com.ogs_to_ogatak";

// /game/123, /game/view/123, /review/456, /demo/789 (demos are reviews in the API)
function parseOgsUrl(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.hostname !== "online-go.com") return null;
  const m = u.pathname.match(/^\/(game|review|demo)\/(?:view\/)?(\d+)/);
  if (!m) return null;
  const kind = m[1] === "game" ? "games" : "reviews";
  return { kind, id: m[2], apiPath: `/api/v1/${kind}/${m[2]}/sgf` };
}

// Grey out the toolbar icon everywhere except OGS game/review/demo pages.
// OGS is a single-page app, so re-check on every URL change (tabs.onUpdated fires
// for pushState navigations too). tab.url is only visible on online-go.com, so
// any other site parses as null and stays disabled.
function syncAction(tab) {
  if (parseOgsUrl(tab.url || "")) chrome.action.enable(tab.id);
  else chrome.action.disable(tab.id);
}

chrome.action.disable();
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => syncAction(tab));
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({})) syncAction(tab);
});

// Runs inside the OGS tab so the request carries the user's session (private games).
async function fetchInPage(apiPath) {
  const r = await fetch(apiPath, { credentials: "include" });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text };
}

function sgfProp(sgf, prop) {
  const m = sgf.match(new RegExp(`[;\\]\\s]${prop}\\[((?:\\\\.|[^\\]])*)\\]`));
  return m ? m[1].replace(/\\(.)/g, "$1").trim() : "";
}

function makeFilename(info, sgf) {
  const clean = (s) => s.replace(/[^\p{L}\p{N}_.-]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  const pb = clean(sgfProp(sgf, "PB"));
  const pw = clean(sgfProp(sgf, "PW"));
  const prefix = info.kind === "games" ? "ogs" : "ogs-review";
  const players = pb || pw ? `-${pb || "B"}-vs-${pw || "W"}` : "";
  return `${prefix}-${info.id}${players}.sgf`;
}

async function flash(tabId, text, color, title) {
  await chrome.action.setBadgeBackgroundColor({ tabId, color });
  await chrome.action.setBadgeText({ tabId, text });
  if (title) await chrome.action.setTitle({ tabId, title });
  if (text === "…") return;
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
    chrome.action.setTitle({ tabId, title: "Open in Ogatak" }).catch(() => {});
  }, text === "ok" ? 2500 : 8000);
}

chrome.action.onClicked.addListener(async (tab) => {
  const info = parseOgsUrl(tab.url || "");
  if (!info) {
    return flash(tab.id, "?", "#888", "Not an online-go.com game/review page");
  }
  try {
    await flash(tab.id, "…", "#557");
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fetchInPage,
      args: [info.apiPath],
    });
    if (!result.ok || !result.text.trim().startsWith("(")) {
      throw new Error(`OGS returned HTTP ${result.status} for ${info.apiPath}`);
    }
    const reply = await chrome.runtime.sendNativeMessage(HOST, {
      filename: makeFilename(info, result.text),
      sgf: result.text,
    });
    if (!reply || !reply.ok) throw new Error(reply?.error || "No reply from native host");
    await flash(tab.id, "ok", "#2a2", `Opened ${reply.path}`);
  } catch (e) {
    console.error(e);
    await flash(tab.id, "err", "#c22", `OGS → Ogatak failed: ${e.message}`);
  }
});
