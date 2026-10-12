"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { validateLinks, validateWorkspace } = require("../scripts/validate-links");
const { createServer } = require("../server");

test("validates project links and rejects unsafe destinations", () => {
  assert.equal(validateLinks([{ title: "Example", url: "https://example.com" }]).length, 1);
  assert.throws(() => validateLinks([{ title: "Bad", url: "javascript:alert(1)" }]), /HTTP or HTTPS/);
  assert.throws(() => validateLinks([{ title: "One", url: "https://example.com" }, {
    title: "one",
    url: "https://other.example"
  }]), /duplicates/);
});

test("validates shared folders and links", () => {
  const workspace = {
    links: [{ title: "Main app", url: "https://example.com" }],
    folders: [{ name: "REGISTARTION", links: [{ title: "Form", url: "https://forms.example.com" }] }]
  };
  assert.equal(validateWorkspace(workspace), workspace);
  assert.equal(validateWorkspace({ links: [], folders: [{ name: "Empty", links: [] }] }).folders.length, 1);
  assert.throws(() => validateWorkspace({
    links: [],
    folders: [{ name: "One", links: [] }, { name: "one", links: [] }]
  }), /reserved or duplicate/);
  assert.throws(() => validateWorkspace({
    links: [{ title: "Same", url: "https://example.com" }],
    folders: [{ name: "Other", links: [{ title: "same", url: "https://other.example" }] }]
  }), /duplicates/);
  assert.throws(() => validateWorkspace({
    links: [],
    folders: [{ name: "Bad", links: [{ title: "Unsafe", url: "javascript:alert(1)" }] }]
  }), /HTTP or HTTPS/);
});

test("serves the read-only app and its links without a database", async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const get = (pathname) => new Promise((resolve, reject) => {
    http.get(`${origin}${pathname}`, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    }).on("error", reject);
  });

  const page = await get("/");
  assert.equal(page.status, 200);
  assert.match(page.body, /public\/links\.json/);
  assert.doesNotMatch(page.body, /Sign in to MAGNUS/);

  const response = await get("/links.json");
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /application\/json/);
  const workspace = JSON.parse(response.body);
  assert.equal(workspace.links.length, 3);
  assert.equal(workspace.folders[0].name, "REGISTARTION");
  assert.equal(workspace.folders[0].links.length, 2);
  assert.equal(workspace.folders[0].links[0].url, "https://registrationdata.magnusinnovative.com/dashboard");
  assert.equal(workspace.folders[0].links[1].url, "https://forms.gle/KfuBirtWb5WUi4ZG9");

  assert.equal((await get("/api/users")).status, 404);
  const script = await get("/app.js");
  assert.equal(script.status, 200);
  assert.match(script.headers["content-type"], /javascript/);
  assert.match(script.body, /REGISTARTION/);
  assert.match(script.body, /#\/magnus\/f\//);
  const stylesheet = await get("/styles.css");
  assert.equal(stylesheet.status, 200);
  assert.match(stylesheet.headers["content-type"], /css/);

  const logo = await get("/magnus-logo.png");
  assert.equal(logo.status, 200);
  assert.match(logo.headers["content-type"], /image\/png/);
  assert.ok(logo.body.length > 0);

  const manifest = await get("/manifest.webmanifest");
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers["content-type"], /application\/manifest\+json/);
  assert.equal(JSON.parse(manifest.body).icons[0].src, "/icon-192.png");
});
