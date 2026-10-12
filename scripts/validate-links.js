"use strict";

const fs = require("node:fs");
const path = require("node:path");

const linksPath = path.join(__dirname, "..", "public", "links.json");

function validateLinks(links) {
  if (!Array.isArray(links)) throw new Error("public/links.json must contain an array.");
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

if (require.main === module) {
  try {
    const links = JSON.parse(fs.readFileSync(linksPath, "utf8"));
    validateLinks(links);
    console.log(`Validated ${links.length} application links.`);
  } catch (error) {
    console.error(`Invalid application links: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { validateLinks };
