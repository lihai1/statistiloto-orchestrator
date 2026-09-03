# Statistiloto — Flow Documentation

Mermaid diagrams for the main user flows from the orchestrator perspective.

---

## 1. Full Request Flow (Generate Form)

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant P as Traefik
    participant J as Java BFF
    participant G as Go Lottery Service
    participant DB as PostgreSQL

    U->>P: POST /api/generate/form (Bearer JWT)
    P->>P: Rate limit check
    P->>J: ForwardAuth → /api/auth/verify (JWT)
    J->>J: Validate JWT vs Keycloak JWKS
    J-->>P: 200 OK (token valid)
    P->>J: Forward request to /api/generate/form
    J->>J: Extract user sub from JWT
    J->>G: gRPC GenerateForm(request)
    G->>DB: SELECT * FROM lottery.lottery_results WHERE date_range
    DB-->>G: Historical draws
    G->>G: LoadArchive → LotteryArray → GenerateNewCombinations
    G-->>J: GenerateFormResponse (forms)
    J-->>P: JSON response
    P-->>U: 200 OK { forms: [[...]] }
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant P as Traefik
    participant KC as Keycloak
    participant J as Java BFF
    participant G as Go Service

    U->>P: Click "Login"
    P->>KC: Redirect to /auth/realms/statistiloto/protocol/openid-connect/auth
    KC->>U: Login page (PKCE challenge)
    U->>KC: Submit credentials
    KC->>KC: Validate → issue RS256 JWT (access + refresh)
    KC-->>U: Redirect back with authorization code
    U->>KC: Exchange code for tokens (PKCE verifier)
    KC-->>U: access_token + refresh_token

    Note over U: JWT stored in memory / sessionStorage

    U->>P: GET /api/me (Bearer access_token)
    P->>J: ForwardAuth → verify JWT
    J->>KC: Fetch JWKS (cached 15 min)
    J->>J: Verify signature + audience + expiry
    J-->>P: 200 OK
    P->>J: Forward to /api/me
    J-->>U: { sub, email, roles }

    Note over J,G: Every service validates JWT independently (defense-in-depth)
```

---

## 2a. Social Login Flow (Google / Facebook)

Optional identity providers configured in the Keycloak realm. Credentials are
injected via `.env` (`GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`).
If the env vars are empty, the provider buttons appear on the login page but
produce an error when clicked. Both providers use `trustEmail: false` and the
built-in `first broker login` flow.

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant KC as Keycloak
    participant IDP as Google / Facebook
    participant J as Java BFF
    participant G as Go Service

    U->>KC: Click "Sign in with Google" (or Facebook)
    KC->>IDP: OAuth redirect (clientId from env)
    IDP->>U: Provider login + consent
    U->>IDP: Authenticate
    IDP-->>KC: Authorization code callback
    KC->>IDP: Exchange code for user info
    IDP-->>KC: Email + profile

    alt Email matches existing account
        KC->>U: Prompt for existing password (first broker login flow)
        U->>KC: Confirm password
        KC->>KC: Link social identity to existing account
    else No matching email
        KC->>KC: Create new account (USER role, /users + /unverified groups)
    end

    KC-->>U: Issue RS256 JWT (same as password login)
    U->>J: API call with Bearer JWT
    Note over J,G: Same JWT validation path as password login
```

---

## 3. Agent Chat Flow

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant P as Traefik
    participant J as Java BFF
    participant A as Agent Service
    participant LLM as Ollama LLM
    participant G as Go Service
    participant DB as PostgreSQL (agent schema)

    U->>P: POST /api/agent/chat { session_id, message }
    P->>J: ForwardAuth + forward
    J->>A: POST /chat (SSE, JWT propagated)
    A->>A: Validate JWT, extract tier + sub
    A->>A: Supervisor routes by intent + tier
    A->>DB: RAG query (pgvector, role-scoped)
    DB-->>A: Relevant context
    A->>LLM: Generate response (streaming)
    LLM-->>A: Token stream

    alt Write tool needed (save_numbers / trigger_scraper)
        A->>A: interrupt() — HITL pause
        A-->>J: SSE event: { type: "hitl", tool, args }
        J-->>U: SSE: HITL approval needed
        U->>P: POST /api/agent/approve { session_id, approved }
        P->>J: Forward
        J->>A: POST /approve
        A->>A: Command(resume=approved)
        A->>G: gRPC tool call (if lottery tool)
        A->>J: HTTP tool call (if save_numbers)
        A-->>J: SSE: tool result
        J-->>U: SSE: result
    end

    A-->>J: SSE: { type: "done" }
    J-->>U: SSE stream complete
```

---

## 4. Service Startup & Dependency Flow

```mermaid
flowchart TD
    DB[(PostgreSQL<br/>pgvector:pg16)]
    AUTH[Keycloak 25]
    LOTTERY[Go Lottery Service]
    AGENT[Python Agent]
    OLLAMA[Ollama LLM]
    SERVER[Java BFF]
    UI[Angular PWA]
    PROXY[Traefik]

    DB -->|healthy| AUTH
    DB -->|healthy| LOTTERY
    DB -->|healthy| AGENT
    AUTH -->|healthy| SERVER
    LOTTERY -->|healthy| SERVER
    AGENT -->|healthy| SERVER
    OLLAMA -.->|runtime only (no startup dep)| AGENT

    AUTH --> PROXY
    SERVER --> PROXY
    AGENT --> PROXY
    UI --> PROXY

    style DB fill:#336791,color:#fff
    style AUTH fill:#e87431,color:#fff
    style PROXY fill:#24a1c1,color:#fff
```

Startup ordering enforced by Compose `depends_on` with `condition: service_healthy`:
1. **db** — PostgreSQL starts first, runs init scripts (schemas + grants)
2. **auth** — Keycloak waits for db healthy, imports realm
3. **lottery** — Go service waits for db healthy, runs Liquibase, starts scraper schedule
4. **agent** — Python agent waits for db, auth, and lottery healthy
5. **ollama** — Independent; no `depends_on`. The agent calls it at runtime
   (LLM inference), so it must be up before the first chat request, but Compose
   does not gate agent startup on it.
6. **server** — Java BFF waits for db, auth, lottery, and agent all healthy
7. **ui** — Independent (static files)
8. **proxy** — Traefik starts last, depends on auth, server, agent, ui

---

## 5. Scraper Flow (Data Freshness)

```mermaid
sequenceDiagram
    participant CRON as Cron Scheduler
    participant G as Go Lottery Service
    participant WEB as Israeli Lottery Site<br/>(pais.co.il)
    participant DB as PostgreSQL (lottery schema)

    CRON->>G: Trigger scraper (default: 0 3 * * *)
    G->>WEB: HTTP GET — fetch latest draws
    WEB-->>G: HTML / JSON draw data
    G->>G: Parse draws (numbers, strong, date, draw_number)
    G->>DB: InsertNewDraws — INSERT ... ON CONFLICT DO NOTHING
    DB-->>G: New rows only + affected date range (minDate, maxDate)
    G->>G: InvalidateRange(minDate, maxDate) — evict cached archive windows overlapping the range

    alt First boot (table empty)
        G->>G: Read /seed/lotto.data
        G->>DB: Bulk INSERT historical draws
    end

    alt Prize backfill (best-effort, non-fatal)
        G->>DB: GetDrawsWithoutPrizeRefs(limit)
        DB-->>G: Draw refs missing prize data
        G->>WEB: HTTP GET per-draw prize page
        WEB-->>G: HTML prize table
        G->>DB: UpdatePrizeAmounts(drawNumber, amounts)
        DB-->>G: Affected draw date
        G->>G: InvalidateRange(affected dates)
    end

    alt Scraper fails (site down / changed)
        G->>G: Log error, keep existing data
        Note over G: lotto.data seed remains as fallback
    end
```

---

## 6. Simulate (Backtest) Flow

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant P as Traefik
    participant J as Java BFF
    participant G as Go Lottery Service
    participant DB as PostgreSQL (lottery schema)

    U->>P: POST /api/generate/simulate { form, strong, from, to, ticketCost, prizeAmounts }
    P->>J: ForwardAuth + forward
    J->>J: Validate JWT, extract user_sub
    J->>G: gRPC Simulate(SimulateRequest)
    G->>DB: SELECT * FROM lottery.lottery_results WHERE date_range
    DB-->>G: Historical draws (incl. prize_amounts)
    G->>G: For each draw: enumerate C(N,6) combinations, score tier hits
    G->>G: Use draw.prize_amounts when present (used_real_prizes=true), else defaults/overrides
    G-->>J: SimulateResponse { draws[], summary }
    J-->>P: JSON response
    P-->>U: 200 OK { draws, summary }
```

> For systematic forms (8/10/12 numbers), every C(N,6) combination is played per
> draw, so a single draw can hit multiple prize tiers. `summary.drawsWithRealPrizes`
> counts draws priced from scraped per-draw data vs. defaults/overrides.

---

## 7. Saved Numbers CRUD Flow

```mermaid
sequenceDiagram
    participant U as Browser / PWA
    participant P as Traefik
    participant J as Java BFF
    participant DB as PostgreSQL (app schema)

    U->>P: POST /api/user/numbers { category, numbers, willBe, dateFrom, dateTo }
    P->>J: ForwardAuth + forward
    J->>J: Validate JWT, extract user_sub
    J->>DB: INSERT INTO app.saved_numbers (user_sub, ...)
    DB-->>J: Row created
    J-->>U: 201 Created { id, ... }

    U->>P: GET /api/user/numbers
    P->>J: Forward
    J->>DB: SELECT * FROM app.saved_numbers WHERE user_sub = ?
    DB-->>J: Rows
    J-->>U: 200 OK [ { id, category, numbers, ... } ]

    U->>P: DELETE /api/user/numbers/{id}
    P->>J: Forward
    J->>DB: DELETE FROM app.saved_numbers WHERE id = ? AND user_sub = ?
    DB-->>J: Row deleted
    J-->>U: 204 No Content
```
