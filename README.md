# MAGNUS Company Workspace

A static, read-only directory of company application links. It runs on Vercel without a database, account credentials, or environment variables.

## Deploy to Vercel

1. Push this project to a Git repository and import it into Vercel.
2. Keep the project root at the repository root. Vercel uses the included `vercel.json` to run `npm run build` and publish the `public` directory.
3. Deploy. No database or environment variables are required.

## Change application links

Edit [`public/links.json`](./public/links.json), commit the change, and redeploy. The change is shared by everyone visiting the workspace. Each entry must have a unique title and an `http` or `https` URL. The build validates the list before deployment.

Visitors can browse, search, and open the listed links. Link editing, sign-in, and user administration are intentionally not available in this database-free static version.

## Local development

Install Node.js 22 or newer, then run:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:3000`. Run `npm test` to check link validation and local static serving.

In VS Code, open **Run and Debug**, select **Run MAGNUS app**, and press **F5**. VS Code starts the server and opens the app in your browser.
