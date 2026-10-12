"use strict";

const fs = require("node:fs");
const path = require("node:path");

const linksPath = path.join(__dirname, "..", "public", "links.json");

function validateLinks(links) {
  if (!Array.isArray(links)) throw new Error("A link list must be an array.");
  const titles = new Set();

  for (const [index, link] of links.entries()) {
    if (!link || typeof link.title !== "string" || !link.title.trim() || link.title.trim().length > 120) {
      throw new Error(`Link ${index + 1} must have a title between 1 and 120 characters.`);
    }
    if (titles.has(link.title.trim().toLocaleLowerCase())) {
      throw new Error(`Link ${index + 1} duplicates an existing application title.`);
    }
    titles.add(link.title.trim().toLocaleLowerCase());
    if (typeof link.url !== "string" || link.url.length > 2048) {
      throw new Error(`Link ${index + 1} must have a valid HTTP or HTTPS URL.`);
    }
    let url;
    try {
      url = new URL(link.url);
    } catch {
      throw new Error(`Link ${index + 1} must have a valid HTTP or HTTPS URL.`);
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error(`Link ${index + 1} must have a valid HTTP or HTTPS URL.`);
    }
  }
  return links;
}

function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object" || Array.isArray(workspace)) {
    throw new Error("public/links.json must contain a workspace object.");
  }
  if (!Array.isArray(workspace.links)) {
    throw new Error('public/links.json must contain a "links" array.');
  }
  if (!Array.isArray(workspace.folders)) {
    throw new Error('public/links.json must contain a "folders" array.');
  }

  const folderNames = new Set();
  const allLinks = [...workspace.links];
  for (const [index, folder] of workspace.folders.entries()) {
    if (!folder || typeof folder.name !== "string" || !folder.name.trim() || folder.name.trim().length > 60) {
      throw new Error(`Folder ${index + 1} must have a name between 1 and 60 characters.`);
    }
    const name = folder.name.trim().toLocaleLowerCase();
    if (name === "magnus" || folderNames.has(name)) {
      throw new Error(`Folder ${index + 1} has a reserved or duplicate name.`);
    }
    folderNames.add(name);
    if (!Array.isArray(folder.links)) {
      throw new Error(`Folder "${folder.name}" must contain a "links" array.`);
    }
    allLinks.push(...folder.links);
  }
  validateLinks(allLinks);
  return workspace;
}

if (require.main === module) {
  try {
    const workspace = JSON.parse(fs.readFileSync(linksPath, "utf8"));
    validateWorkspace(workspace);
    const linkCount = workspace.links.length
      + workspace.folders.reduce((count, folder) => count + folder.links.length, 0);
    console.log(`Validated ${linkCount} application links in ${workspace.folders.length} shared folders.`);
  } catch (error) {
    console.error(`Invalid application links: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validateLinks, validateWorkspace };
