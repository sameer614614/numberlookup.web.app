# CallerID on Firebase

This repository contains the Firebase-first rewrite of the CallerID platform. It mirrors the public
features of the original VPS deployment—phone number intelligence and a Markdown-powered blog—while
replacing the infrastructure with Firebase Hosting, Cloud Functions, Firestore, the Realtime Database,
and Cloud Storage.

## Project structure

| Path | Purpose |
| --- | --- |
| `web/` | Vite + React single-page app that calls the Cloud Functions API. |
| `functions/` | TypeScript Cloud Functions implementing number lookups, caching, and blog content delivery. |
| `firebase.json` | Firebase project configuration for Hosting rewrites and security rules. |
| `firestore.rules`, `storage.rules`, `database.rules.json` | Security rules for the managed services. |

## Prerequisites

* Node.js 20+
* npm 9+
* Firebase CLI (`npm install -g firebase-tools`)
* A Veriphone API key (or compatible provider) stored in the Firebase Functions config

## Local development

1. Install dependencies:

   ```bash
   npm install --prefix functions
   npm install --prefix web
   ```

2. Build the Cloud Functions once (the Firebase emulator will recompile automatically after changes):

   ```bash
   npm run build --prefix functions
   ```

3. Start the Firebase emulators:

   ```bash
   firebase emulators:start --only functions,hosting
   ```

   The web app is served from `http://localhost:5000` and proxies `/api` requests to the Functions emulator.

4. During local development the Functions fall back to Markdown files in `functions/sample-posts/` so the blog
   renders without needing Cloud Storage. Upload the same Markdown files to the `posts/` folder of your default
   storage bucket before deploying.

## Deployment checklist

1. Authenticate with Firebase and select the target project:

   ```bash
   firebase login
   firebase use <your-project-id>
   ```

2. Configure runtime settings for the Cloud Functions:

   ```bash
   firebase functions:config:set \
     veriphone.key="<VERIPHONE_API_KEY>" \
     veriphone.base_url="https://api.veriphone.io/v2/verify" \
     app.default_region="US" \
     app.cache_ttl="3600" \
     app.posts_prefix="posts/" \
     app.realtime_cache_path="cache/lookups"
   ```

3. Deploy:

   ```bash
   npm run build --prefix web
   firebase deploy
   ```

After deployment the site is available via Firebase Hosting and the API at `/api/*` is powered by the Cloud
Function exported as `api`.

## Environment variables

When running outside of the Firebase CLI you can configure the Functions with environment variables:

* `VERIPHONE_API_KEY`
* `VERIPHONE_BASE_URL` (optional)
* `DEFAULT_REGION` (defaults to `US`)
* `CACHE_TTL_SECONDS` (defaults to `3600`)
* `POSTS_PREFIX` (defaults to `posts/`)
* `REALTIME_CACHE_PATH` (defaults to `cache/lookups`)

## Testing the API manually

```bash
curl "http://localhost:5001/<project-id>/us-central1/api/lookup?number=%2B14155552671"
```

The response mirrors the legacy API schema with `number`, `carrier`, `country`, `location`, `reputation`,
and `normalized` fields.

## Next steps

* Connect Firebase Authentication if you want to expose write operations to trusted users.
* Add scheduled Cloud Functions to warm the cache for popular numbers.
* Replace the sample Markdown posts with your production content in Cloud Storage.
