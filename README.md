# MBR-UI

A UI that replaces static MBRs and lets leaders get a short recap of the last cycle and ask questions.

## Deploy for colleagues

This app needs a backend secret, so deploy it on a server/container platform (not static hosting).

### Fastest option: Render (free tier available)

1. Push this repository to GitHub.
2. In Render, create a new Web Service from this repo.
3. Render detects [render.yaml](render.yaml) automatically.
4. In Render service settings, set environment variable ANTHROPIC_API_KEY to your real key.
5. Deploy and share the generated URL with colleagues.

Notes:
- Health endpoint is available at /healthz.
- The app is served by [server.js](server.js), and the UI calls /api/chat.

### Generic Docker platforms (Azure App Service, AWS App Runner, etc.)

1. Build and run using [Dockerfile](Dockerfile).
2. Provide ANTHROPIC_API_KEY as a secret in the platform.
3. Optionally set ANTHROPIC_MODEL.
4. Expose port 3000 (or provide PORT from platform).

## Run with server-side Anthropic secret

The UI now calls a local backend proxy, so users do not need to paste an API key in the browser.

1. Set your Anthropic key as an environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

2. (Optional) configure model/port:

```bash
export ANTHROPIC_MODEL="claude-sonnet-4-20250514"
export PORT=3000
```

3. Start the app:

```bash
node server.js
```

4. Open:

```text
http://localhost:3000
```

You can also copy [.env.example](.env.example) as a reference for required variables.
