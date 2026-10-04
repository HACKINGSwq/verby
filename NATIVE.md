# Verby v7.9 — Native Desktop / Mobile App Shell

## Capacitor (iOS + Android)

```bash
cd verby-site
npm install
npm run build
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # or: npx cap open ios
```

`capacitor.config.json` points `server.url` at `https://verby-ai.vercel.app` so the native shell loads the live SPA (or switch `webDir: dist` for fully offline bundle).

## Desktop (Tauri / Electron optional)

For a pure desktop shell you can wrap the same `dist/` with Tauri 2:

```bash
npm create tauri-app
# set frontendDist to ./dist
```

## Offline-SLM

`OfflineSLM` in `app-core.js` is a placeholder for WebLLM / Transformers.js / ONNX Runtime Web.
When a small local model is loaded, chats fall back offline without hitting `/api/ai`.

## Security notes

- **Keys**: only on Vercel env (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Client keys optional.
- **Auth**: Supabase PKCE. Tokens in localStorage (SPA). Full HTTP-only cookie sessions need a server BFF (planned v8).
- **Realtime**: Supabase Realtime on `verby_chats` for multi-device sync.
- **Schema**: run `supabase-schema.sql` in Supabase SQL editor.
