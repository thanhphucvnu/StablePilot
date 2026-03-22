# StablePilot — Judge Quick Reference (1 page)

## What it is

**Treasury Governance OS:** an agent that monitors USDT, decides under **policy + reproducible z-score statistics**, and executes **WDK transfers** (or queues them for human approval).

## Why it matters

| Judge criterion | Where StablePilot delivers |
|-----------------|----------------------------|
| **WDK integration** | `src/integrations/wdkClient.ts` — balance read + USDT transfer POST. |
| **Agent autonomy** | `src/agent.ts` — loop + autonomous vs approval mode + webhooks. |
| **Safety / soundness** | Circuit breaker, daily cap, cooldown, strict z-gate, maintenance freeze. |
| **Auditability** | `/audit/bundle`, `/policy/fingerprint`, `/attestation/snapshot`, CSV/JSON history, `/proof/run/:id`. |
| **Operability** | Dashboard + SSE + Prometheus `/metrics` + OpenAPI `/openapi.json`. |

## 5 URLs to try (local demo)

1. `GET http://localhost:8080/briefing/judge` — one-screen demo JSON.  
2. `GET http://localhost:8080/insights/stability-index` — composite stability score.  
3. `GET http://localhost:8080/innovation/manifest` — claimed differentiators + proof paths.  
4. `GET http://localhost:8080/public/status` — minimal embed card.  
5. `GET http://localhost:8080/api/routes` — full route index.

## Simulation vs live WDK

| Mode | Config | Behavior |
|------|--------|----------|
| **Demo-safe** | `SIMULATION_MODE=true` | No real keys; balances and tx ids simulated. |
| **Live** | `SIMULATION_MODE=false` + WDK env vars | Real API calls to configured WDK base URL. |

## Repo layout (high signal)

```
galactica-agent/
  src/agent.ts           # Orchestration
  src/integrations/wdkClient.ts  # WDK
  src/server.ts          # All HTTP routes
  public/index.html      # Dashboard
  data/                  # Persisted JSON (runtime)
  submission/            # Hackathon form answers + this file
```

## Contact / links

- **Repo:** `[YOUR_PUBLIC_REPO_URL]`  
- **Video:** `[YOUR_VIDEO_URL]`  
- **Team:** `[NAMES]` — `[EMAIL_OR_DISCORD_IF_ALLOWED]`
