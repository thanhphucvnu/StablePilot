# StablePilot

Treasury Governance OS — WDK-backed USDT agent with a four-layer pipeline, optional approvals, and 80+ HTTP APIs.

## Quick start

```bash
cd galactica-agent
npm install
npm run dev
```

Open `http://localhost:8080`. Copy `config.example.txt` to `.env` and adjust. Use `SIMULATION_MODE=true` for safe demos without live WDK keys.

## Public demo (stable URL)

1. Sign up at [Render](https://render.com) (free tier).
2. **New → Blueprint** → connect [`thanhphucvnu/StablePilot`](https://github.com/thanhphucvnu/StablePilot) → Render reads root [`render.yaml`](render.yaml).
3. Confirm the **Docker** service (build context `galactica-agent`). Deploy finishes in a few minutes.
4. You get a fixed URL like `https://stablepilot.onrender.com` (exact subdomain is yours to choose in the UI).

Free instances **spin down** after idle; the first request after sleep may take ~30–60s (cold start).

**Auto-redeploy on git push:** add GitHub secret `RENDER_DEPLOY_HOOK_URL` from Render → your service → **Settings → Deploy Hook** (see [`.github/workflows/render-deploy-hook.yml`](.github/workflows/render-deploy-hook.yml)).

## Docs

- App README: [`galactica-agent/README.md`](galactica-agent/README.md)
- Hackathon submission copy: [`submission/`](submission/)
- Docker build: [`galactica-agent/Dockerfile`](galactica-agent/Dockerfile)

## License

Hackathon submission — see repository owner for terms.
