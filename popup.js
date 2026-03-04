async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0];
}

async function getState(tabId) {
  return browser.runtime.sendMessage({ type: "INLINE_PASTE_GET_STATE", tabId });
}

async function setMode(tabId, mode) {
  await browser.runtime.sendMessage({ type: "INLINE_PASTE_SET_MODE", tabId, mode });
  window.close();
}

async function openOptions() {
  if (browser.runtime.openOptionsPage) {
    await browser.runtime.openOptionsPage();
  }
  window.close();
}

(async () => {
  const tab = await getActiveTab();
  if (!tab) return;

  const state = await getState(tab.id);
  const mode = state.mode || "auto";

  for (const el of document.querySelectorAll(".item[data-mode]")) {
    el.setAttribute("aria-checked", el.dataset.mode === mode ? "true" : "false");
  }

  document.addEventListener("click", async (e) => {
    const target = e.target.closest(".item");
    if (!target) return;

    if (target.dataset.openOptions) {
      await openOptions();
      return;
    }

    const m = target.dataset.mode;
    if (m) await setMode(tab.id, m);
  });
})();