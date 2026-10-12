# MAGNUS Company Workspace

A static, read-only directory of company application links. It runs on Vercel without a database, account credentials, or environment variables.

## Deploy to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Keep the project root at the repository root. Vercel uses the included `vercel.json` to run `npm run build` and publish the `public` directory.
3. Deploy. No database or environment variables are required.

## Add shared folders and links

Edit [`public/links.json`](./public/links.json), commit the change, and redeploy. Changes are shared by everyone visiting the workspace. Put links shown directly in **MAGNUS** under `"links"`. Put folders under `"folders"`; each folder has a `"name"` and a `"links"` array. Folder names and link titles must be unique, and links must use `http` or `https`. The build validates the configuration before deployment.

To add a link inside **REGISTARTION**, add an item to that folder's `"links"` array:

```json
{
  "title": "New Registration Link",
  "url": "https://example.com"
}
```

To create another shared folder, add another entry to `"folders"` with its name and links. Use an empty array when creating an empty folder:

```json
{
  "name": "ANOTHER FOLDER",
  "links": [
    {
      "title": "Example Link",
      "url": "https://example.com"
    }
  ]
}
```

Visitors can browse, search, and open the listed links. Link editing, sign-in, and user administration are intentionally not available in this database-free static version.

The shared folders and their links are read-only in the app; edit `public/links.json` and redeploy to publish changes.
Links on Google domains (including Google Drive, Docs, Sheets, and Forms), links to common form services, or links whose title or path identifies them as a form include a **Copy link** button.

## Local development

Install Node.js 22 or newer, then run:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Run `npm test` to check link validation and local static serving.

In VS Code, open **Run and Debug**, select **Run MAGNUS app**, and press **F5**. VS Code starts the server and opens the app in your browser.
