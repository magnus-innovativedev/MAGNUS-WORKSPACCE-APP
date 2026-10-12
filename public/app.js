"use strict";

(() => {
  const STORAGE_KEY = "magnus.folders.v2";
  const OLD_KEY = "magnus.personalLinks.v1";
  const MAGNUS_ID = "magnus";
  const $ = (selector) => document.querySelector(selector);

  const homeView = $("#home-view");
  const folderView = $("#folder-view");
  const folderGrid = $("#folder-grid");
  const searchGrid = $("#search-grid");
  const linkGrid = $("#link-grid");
  const search = $("#search");
  const folderCount = $("#folder-count");
  const linkCount = $("#link-count");
  const folderTitle = $("#folder-title");
  const folderActions = $("#folder-actions");
  const notice = $("#notice");
  const folderForm = $("#folder-form");
  const folderInput = $("#new-folder");
  const addForm = $("#add-form");
  const titleInput = $("#new-title");
  const urlInput = $("#new-url");
  const installButton = $("#install-btn");
  const installHint = $("#install-hint");

  let sharedLinks = [];
  let sharedFolders = [];
  let folders = loadFolders();

  // ---------- helpers ----------
  function say(message, ok = false) {
    notice.textContent = message;
    notice.classList.toggle("success", ok);
  }

  function newId() {
    return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function parseUrl(raw) {
    let text = String(raw || "").trim();
    if (!text) throw new Error("Enter a link.");
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("Links must be valid http or https addresses.");
    }
    if (url.href.length > 2048) throw new Error("That link is too long.");
    return url.href;
  }

  const same = (a, b) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

  function cleanLinks(data) {
    const out = [];
    if (!Array.isArray(data)) return out;
    for (const item of data) {
      if (!item || typeof item.title !== "string") continue;
      const title = item.title.trim().slice(0, 120);
      if (!title || out.some((l) => same(l.title, title))) continue;
      try { out.push({ title, url: parseUrl(item.url) }); } catch { /* skip invalid */ }
    }
    return out;
  }

  function cleanFolders(data) {
    const out = [];
    if (!Array.isArray(data)) return out;
    for (const item of data) {
      if (!item || typeof item.name !== "string") continue;
      let name = item.name.trim().slice(0, 60);
      if (!name) continue;
      if (same(name, "MAGNUS")) name = "MAGNUS (mine)";
      if (out.some((f) => same(f.name, name))) continue;
      out.push({ id: typeof item.id === "string" && item.id ? item.id : newId(), name, links: cleanLinks(item.links) });
    }
    return out;
  }

  // ---------- storage (this device only) ----------
  function loadFolders() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return cleanFolders(JSON.parse(saved));
      const old = cleanLinks(JSON.parse(localStorage.getItem(OLD_KEY) || "[]"));
      if (old.length) {
        const migrated = [{ id: newId(), name: "My links", links: old }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch { /* fall through */ }
    return [];
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
      return true;
    } catch {
      say("Could not save on this device. Private browsing or full storage may be the cause.");
      return false;
    }
  }

  // ---------- routing (#/magnus or #/f/<id>) ----------
  function currentFolder() {
    const hash = location.hash;
    if (hash === "#/magnus") return { id: MAGNUS_ID, name: "MAGNUS", links: sharedLinks, locked: true };
    const sharedMatch = /^#\/magnus\/f\/(.+)$/.exec(hash);
    const sharedName = hash === "#/magnus/registration"
      ? "REGISTARTION"
      : sharedMatch ? decodeURIComponent(sharedMatch[1]) : "";
    const sharedFolder = sharedFolders.find((folder) => same(folder.name, sharedName));
    if (sharedFolder) return { ...sharedFolder, id: `shared:${sharedFolder.name}`, locked: true, nested: true };
    const match = /^#\/f\/(.+)$/.exec(hash);
    if (match) return folders.find((f) => f.id === decodeURIComponent(match[1])) || null;
    return null;
  }

  const goHome = () => { location.hash = ""; };

  // ---------- rendering ----------
  function linkCard(link, folder, showFolderName) {
    const url = new URL(link.url);
    const el = document.createElement("article");
    el.className = "card";

    const favicon = document.createElement("span");
    favicon.className = "favicon";
    favicon.setAttribute("aria-hidden", "true");
    favicon.textContent = link.title.slice(0, 1) || url.hostname.slice(0, 1);

    const info = document.createElement("div");
    info.className = "card-info";
    const title = document.createElement("a");
    title.className = "card-title";
    title.href = url.href;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = link.title;
    title.title = link.title;
    const address = document.createElement("a");
    address.className = "card-url";
    address.href = url.href;
    address.target = "_blank";
    address.rel = "noopener noreferrer";
    address.textContent = showFolderName ? `${folder.name} · ${url.hostname}` : url.hostname;
    address.title = url.href;
    info.append(title, address);
    el.append(favicon, info);

    if (!folder.locked && !showFolderName) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${link.title}`);
      remove.addEventListener("click", () => {
        if (!confirm(`Remove "${link.title}" from this folder?`)) return;
        folder.links = folder.links.filter((l) => l !== link);
        if (save()) say("Link removed.", true);
        render();
      });
      el.append(remove);
    }
    return el;
  }

  function folderCard(folder) {
    const el = document.createElement("article");
    el.className = "card folder-card";
    const icon = document.createElement("span");
    icon.className = "favicon folder-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "📁";
    const info = document.createElement("div");
    info.className = "card-info";
    const open = document.createElement("a");
    open.className = "card-title";
    open.href = folder.route || (folder.locked ? "#/magnus" : `#/f/${encodeURIComponent(folder.id)}`);
    open.textContent = folder.name;
    const meta = document.createElement("a");
    meta.className = "card-url";
    meta.href = open.href;
    let n = folder.links.length;
    let detail = `${n} ${n === 1 ? "link" : "links"}`;
    if (folder.id === MAGNUS_ID) {
      n += sharedFolders.reduce((count, sharedFolder) => count + sharedFolder.links.length, 0);
      detail = `${n} ${n === 1 ? "link" : "links"} · ${sharedFolders.length} ${sharedFolders.length === 1 ? "folder" : "folders"}`;
    }
    meta.textContent = `${detail}${folder.locked ? " · shared with everyone" : ""}`;
    info.append(open, meta);
    el.append(icon, info);
    return el;
  }

  function empty(target, title, detail) {
    const box = document.createElement("div");
    box.className = "empty";
    const t = document.createElement("strong");
    t.textContent = title;
    const d = document.createElement("span");
    d.textContent = detail;
    box.append(t, d);
    target.append(box);
  }

  function renderHome() {
    const q = search.value.trim().toLocaleLowerCase();
    const all = [{ id: MAGNUS_ID, name: "MAGNUS", links: sharedLinks, locked: true }, ...folders];
    folderCount.textContent = `${all.length} ${all.length === 1 ? "folder" : "folders"}`;
    folderGrid.replaceChildren();
    searchGrid.replaceChildren();

    if (!q) {
      folderGrid.hidden = false;
      searchGrid.hidden = true;
      for (const folder of all) folderGrid.append(folderCard(folder));
      return;
    }
    folderGrid.hidden = true;
    searchGrid.hidden = false;
    let found = 0;
    for (const folder of all) {
      for (const link of folder.links) {
        if (`${link.title} ${link.url} ${folder.name}`.toLocaleLowerCase().includes(q)) {
          searchGrid.append(linkCard(link, folder, true));
          found += 1;
        }
      }
    }
    for (const folder of sharedFolders) {
      for (const link of folder.links) {
        if (`${link.title} ${link.url} MAGNUS ${folder.name}`.toLocaleLowerCase().includes(q)) {
          searchGrid.append(linkCard(link, folder, true));
          found += 1;
        }
      }
    }
    if (!found) empty(searchGrid, "No matching links", "Try another search.");
  }

  function renderFolder(folder) {
    folderTitle.textContent = folder.name;
    const n = folder.links.length;
    if (folder.id === MAGNUS_ID) {
      const totalLinks = n + sharedFolders.reduce((count, sharedFolder) => count + sharedFolder.links.length, 0);
      linkCount.textContent = `${totalLinks} ${totalLinks === 1 ? "link" : "links"} · ${sharedFolders.length} ${sharedFolders.length === 1 ? "folder" : "folders"} · shared, read-only`;
    } else {
      linkCount.textContent = `${n} ${n === 1 ? "link" : "links"}${folder.locked ? " · shared, read-only" : ""}`;
    }
    folderActions.hidden = !!folder.locked;
    addForm.hidden = !!folder.locked;
    $("#back-btn").textContent = folder.nested ? "← MAGNUS" : "← All folders";
    linkGrid.replaceChildren();
    if (folder.id === MAGNUS_ID) {
      for (const sharedFolder of sharedFolders) {
        linkGrid.append(folderCard({
          ...sharedFolder,
          id: `shared:${sharedFolder.name}`,
          locked: true,
          route: `#/magnus/f/${encodeURIComponent(sharedFolder.name)}`
        }));
      }
      for (const link of folder.links) linkGrid.append(linkCard(link, folder, false));
      if (sharedFolders.length === 0 && folder.links.length === 0) {
        empty(linkGrid, "This folder is empty", "Add shared folders or links in public/links.json and redeploy.");
      }
      return;
    }
    if (!n) {
      empty(linkGrid, "This folder is empty",
        folder.locked ? "Update public/links.json and redeploy to add applications." : "Use the form above to add a Google Sheet or any other link.");
      return;
    }
    for (const link of folder.links) linkGrid.append(linkCard(link, folder, false));
  }

  function render() {
    const hash = location.hash;
    const folder = currentFolder();
    if (hash && hash !== "#" && !folder && (hash.startsWith("#/magnus/") || hash.startsWith("#/f/"))) {
      // unknown folder (e.g. deleted, or other device)
      location.hash = hash.startsWith("#/magnus/") ? "#/magnus" : "";
      return;
    }
    if (folder) {
      homeView.hidden = true;
      folderView.hidden = false;
      renderFolder(folder);
    } else {
      folderView.hidden = true;
      homeView.hidden = false;
      renderHome();
    }
  }

  window.addEventListener("hashchange", () => { say(""); render(); window.scrollTo(0, 0); });
  search.addEventListener("input", render);
  $("#back-btn").addEventListener("click", () => {
    location.hash = currentFolder() && currentFolder().nested ? "#/magnus" : "";
  });

  // ---------- folder actions ----------
  function folderNameError(name, ignoreId) {
    if (!name || name.length > 60) return "Enter a folder name up to 60 characters.";
    if (same(name, "MAGNUS")) return "The name MAGNUS is reserved for the shared folder.";
    if (folders.some((f) => f.id !== ignoreId && same(f.name, name))) return "You already have a folder with that name.";
    return "";
  }

  folderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = folderInput.value.trim();
    const problem = folderNameError(name);
    if (problem) { say(problem); return; }
    const folder = { id: newId(), name, links: [] };
    folders.push(folder);
    if (!save()) { folders.pop(); return; }
    folderForm.reset();
    say("");
    location.hash = `#/f/${encodeURIComponent(folder.id)}`;
  });

  $("#rename-btn").addEventListener("click", () => {
    const folder = currentFolder();
    if (!folder || folder.locked) return;
    const name = (prompt("Rename folder", folder.name) || "").trim();
    if (!name || name === folder.name) return;
    const problem = folderNameError(name, folder.id);
    if (problem) { say(problem); return; }
    folder.name = name;
    if (save()) say("Folder renamed.", true);
    render();
  });

  $("#delete-folder-btn").addEventListener("click", () => {
    const folder = currentFolder();
    if (!folder || folder.locked) return;
    const n = folder.links.length;
    if (!confirm(`Delete the folder "${folder.name}" and its ${n} ${n === 1 ? "link" : "links"}? This cannot be undone.`)) return;
    folders = folders.filter((f) => f.id !== folder.id);
    save();
    goHome();
    say("Folder deleted.", true);
  });

  addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const folder = currentFolder();
    if (!folder || folder.locked) return;
    try {
      const title = titleInput.value.trim();
      if (!title || title.length > 120) throw new Error("Enter a name up to 120 characters.");
      const url = parseUrl(urlInput.value);
      if (folder.links.some((l) => same(l.title, title))) throw new Error("This folder already has a link with that name.");
      folder.links.push({ title, url });
      if (!save()) { folder.links.pop(); return; }
      addForm.reset();
      say("Link saved on this device.", true);
      render();
      titleInput.focus();
    } catch (error) {
      say(error.message);
    }
  });

  // ---------- backup ----------
  $("#export-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ version: 2, folders }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "magnus-my-folders.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  const importFile = $("#import-file");
  $("#import-btn").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    importFile.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      // accepts the new format, or the old flat list of links
      const incoming = Array.isArray(parsed)
        ? cleanFolders([{ name: "Imported", links: parsed }])
        : cleanFolders(parsed && parsed.folders);
      let addedLinks = 0;
      for (const inc of incoming) {
        const existing = folders.find((f) => same(f.name, inc.name));
        if (existing) {
          for (const link of inc.links) {
            if (!existing.links.some((l) => same(l.title, link.title))) { existing.links.push(link); addedLinks += 1; }
          }
        } else {
          folders.push({ ...inc, id: newId() });
          addedLinks += inc.links.length;
        }
      }
      save();
      say(`Import finished: ${addedLinks} new ${addedLinks === 1 ? "link" : "links"} added.`, true);
      render();
    } catch {
      say("That file is not a valid backup.");
    }
  });

  // ---------- install (PWA) ----------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => { installButton.hidden = true; });

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (isIos && !standalone) installHint.hidden = false;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- load shared MAGNUS links ----------
  fetch("/links.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load applications (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      if (Array.isArray(data)) {
        sharedLinks = data.slice(1, -1);
        sharedFolders = data.length
          ? [{ name: "REGISTARTION", links: data.length > 1 ? [data[0], data[data.length - 1]] : data }]
          : [];
      } else if (data && typeof data === "object" && Array.isArray(data.links) && Array.isArray(data.folders)) {
        sharedLinks = data.links;
        sharedFolders = data.folders;
      } else {
        throw new Error("The application link list has an invalid format.");
      }
      for (const link of [...sharedLinks, ...sharedFolders.flatMap((folder) => {
        if (!folder || typeof folder.name !== "string" || !Array.isArray(folder.links)) {
          throw new Error("The application link list has an invalid format.");
        }
        return folder.links;
      })]) {
        if (!link || typeof link.title !== "string" || typeof link.url !== "string") {
          throw new Error("The application link list has an invalid format.");
        }
        parseUrl(link.url);
      }
      render();
    })
    .catch((error) => {
      notice.textContent = error.message;
      render();
    });

  render();
})();
