# TASKS.md — WAVE

Source of truth for what gets built and in what order. Update status as you work.

**Status legend:**
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[-]` Blocked (reason inline)
- `[s]` Skipped (reason inline)

---

## ✅ Milestone M1 — Smart Contracts on Testnet — COMPLETE

**Goal:** All three Clarity contracts deployed on testnet, all public functions callable, all unit tests passing in Clarinet.

**Acceptance criteria:**
- `clarinet check` passes with zero errors ✓
- All 27 tests green (`pnpm test`) ✓
- `wave-token`: faucet, burn, mint-reward work correctly ✓
- `wave-game`: start-run, submit-score, mint-nft, leaderboard work correctly ✓
- `wave-nft`: SIP-009 interface complete, mint restricted to wave-game ✓
- Deployed on Stacks testnet, contract addresses recorded in `lib/contracts.ts` ✓
  - Deployer: `ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W`

---

### SETUP

- [x] **T001** — Init Next.js project
  - `npx create-next-app@latest wave --typescript --tailwind --app`
  - Add `@baoku26/sbtc-sdk`, `phaser`, `framer-motion`, `lucide-react`
  - Configure `tsconfig.json` strict mode

- [x] **T002** — Init Clarinet project
  - `clarinet new` in project root
  - Configure `Clarinet.toml` with all three contracts
  - Set up `settings/Devnet.toml`

- [x] **T003** — Create `lib/eras.ts`
  - `ERAS` config object with all 6 era definitions (see CLAUDE.md)
  - `EraId` type
  - `ERA_LIST` array for UI rendering

- [x] **T004** — Create `lib/contracts.ts`
  - Testnet deployer: `ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W`
  - Mainnet + testnet contract address mapping
  - Export `getContracts(network)` helper

- [x] **T005** — Set up Upstash Redis
  - `lib/redis.ts` implemented (`Redis.fromEnv()` singleton, `REDIS_KEYS` constants)
  - Database: `polite-oriole-128712.upstash.io` — smoke test passed

- [x] **T006** — Set up Supabase
  - `lib/supabase.ts` implemented (server admin client + browser anon client)
  - Project: `ilrsqxbukmqeciokbmuo.supabase.co` — `profiles` table created with RLS enabled, public SELECT policy applied
  - Smoke test passed (insert + select + delete)

- [x] **T007** — Install and configure shadcn/ui
  - Installed with Nova preset (Tailwind v4 + @base-ui/react)
  - Core components added: `button`, `card`, `badge`, `dialog`, `tabs`, `sheet`, `tooltip`, `avatar`, `input`, `separator`
  - WAVE design tokens wired in `app/globals.css` with shadcn CSS variable bridge

- [x] **T008** — Install Impeccable and generate context files
  - Impeccable v3.0.3 installed
  - `PRODUCT.md` — strategy file, audience, voice, key moments ✓
  - `DESIGN.md` — regenerated in Google Stitch format: YAML frontmatter + 6 sections, North Star "The Bitcoin Surf Report" ✓
  - `.impeccable/design.json` — schemaVersion 2 sidecar with 7 component snippets, tonal ramps, motion tokens ✓

---

### WAVE TOKEN CONTRACT

- [x] **T005** — Implement `contracts/wave-token.clar`
  - SIP-010 interface complete
  - `claim-daily`: 500 WAVE, 144-block cooldown, u0 sentinel for first claim
  - `burn` / `mint-reward`: restricted to `.wave-game` contract-caller

- [x] **T006** — Write `tests/wave-token.test.ts`
  - 12 tests, all passing

---

### WAVE NFT CONTRACT

- [x] **T007** — Implement `contracts/wave-nft.clar`
  - SIP-009 interface complete
  - `nft-metadata` map stores token-uri at mint time (no dynamic string concat)
  - `mint`: restricted to `.wave-game` contract-caller

- [x] **T008** — Write `tests/wave-nft.test.ts`
  - 5 tests, all passing

---

### WAVE GAME CONTRACT

- [x] **T009** — Implement `contracts/wave-game.clar` — data structures
  - `runs`, `leaderboards`, `player-runs` maps
  - 7 error constants (u200–u207)

- [x] **T010** — Implement `start-run(token-id, era-id)`
  - Burns 50 WAVE, stores run, appends run-id to player-runs
  - run-id: `sha256(stacks-block-height-buff || sender-buff)`

- [x] **T011** — Implement `submit-score(run-id, score, tricks, signature)`
  - Signature: `hash160(secp256k1-recover?(sha256(run-id || score-buff || tricks-hash), sig))` == sender hash-bytes
  - Rolling sha256 fold for tricks hash (fixed 32-byte accumulator)

- [x] **T012** — Implement `mint-nft(run-id, ipfs-cid, token-uri)`
  - Burns 100 WAVE, calls `.wave-nft mint`, marks run minted

- [x] **T013** — Implement read-only functions
  - `get-leaderboard`, `get-run`, `get-player-runs`, `get-player-best`

- [x] **T014** — Write `tests/wave-game.test.ts`
  - 10 tests, all passing
  - Note: Clarinet SDK stores `BufferCV.value` as hex string; `extractRunId` converts via `Uint8Array.from(Buffer.from(hex, 'hex'))`

- [x] **T015** — Deploy all three contracts to Stacks testnet
  - Deployer: `ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W`
  - `wave-nft` tx: `e5ed2c137d4a1b709fda23bf40655cf6ddd85899a0f1481097dadbd65203de1e`
  - `wave-token` tx: `d7f126c7676b2be7f88a1c7a2119ebe08d6c376e7b53eb8d3e2fdb66e15bb3aa`
  - `wave-game` tx: `67a2742c09f4e51df08509b7386186e9a95fcef37def0e6d7f12d36a7581d3d6`
  - `lib/contracts.ts` updated with real addresses

---

## ✅ Milestone M2 — Chart Terrain Engine — COMPLETE

**Goal:** Phaser game instance renders real STX price data as surfable terrain with working physics.

- [x] **T016** — Create `app/api/chart-data/route.ts`
  - CoinGecko `market_chart/range` → daily OHLC grouping → normalise
  - ISR revalidate: 86400s; optional `COINGECKO_API_KEY` for pro tier
  - Returns `{ eraId, candles: { date, open, high, low, close, normalised }[] }`

- [x] **T017** — Create `game/EventBus.ts`
  - eventemitter3 singleton with full TypeScript generic event types
  - Events: `game-ready`, `start-run`, `run-complete`, `trick-landed`, `wipeout-warn`, `wipeout`, `score-update`

- [x] **T018** — Create `game/constants.ts`
  - Physics: `GRAVITY=1800`, `JUMP_FORCE=-550`, `SURFER_MASS=1`, `SEGMENT_WIDTH=80`
  - `TRICK_POINTS`: cutback 500, aerial 800, tube 1200
  - `SCORE_TIERS`: bronze/silver/gold/platinum thresholds
  - `COLORS` palette per token (STX blue, sBTC orange, ALEX purple)

- [x] **T019** — Implement `game/terrain/TerrainGenerator.ts`
  - `generateTerrain(candles)` → `TerrainMesh { points, segments, totalWidth }`
  - Global min/max normalisation → canvas Y mapping
  - Cubic bezier interpolation (8 steps per candle segment)
  - Wick zone detection: `(high-low) / |close-open| > 2`

- [x] **T020** — Implement `game/terrain/TerrainRenderer.ts`
  - `renderTerrain(graphics, mesh, token)` → filled polygon + accent stroke per token
  - `renderWickZones(graphics, segments)` → yellow glow overlay on danger zones

- [x] **T021** — Implement `game/scenes/PreloadScene.ts`
  - Minimal loading bar (procedural terrain = no external assets needed)
  - Emits `game-ready` on EventBus → transitions to GameScene

- [x] **T022** — Implement `game/scenes/GameScene.ts`
  - Matter.js terrain bodies from bezier mesh (segmented rectangles at slope angle)
  - Camera follow with LERP on X axis
  - Space/Up: jump; Left/Right: lean; EventBus `start-run` → `run-complete`
  - Wipeout: 1.5s delay then `endRun(false)`

- [x] **T023** — Implement `game/player/Surfer.ts`
  - Matter.js rectangle body (board 44×6 + rider 28×16)
  - Jump impulse; lean torque; double-jump allowed (one in-air re-jump)
  - Wipeout detection: angular velocity > 0.4 or tilt > 70°
  - Airtime accumulation tracked for scoring

- [x] **T024** — Implement `game/scoring/ScoreEngine.ts`
  - Distance (10pts/candle), airtime (5pts/100ms), trick bonuses
  - Multiplier: +10% per unique trick, capped at 3×; daily first attempt +5%
  - Survival bonus: 2000pts; comeback bonus: 500pts
  - `score-update` throttled to 100ms via EventBus

- [x] **T025** — Implement `components/game/GameCanvas.tsx`
  - SSR-safe (dynamic import; `typeof window === 'undefined'` guard)
  - Mounts Phaser via `createGame(containerRef.current)`, cleans up on unmount
  - Bridges EventBus callbacks to React props (`onRunComplete`, `onScoreUpdate`, `onTrickLanded`)

- [x] **T026** — Visual test: STX March 2021 terrain renders and is surfable
  - Hard-coded `stx-bull-2021` OHLC data (28 candles, Mar 1–28 2021, $0.40→$2.05)
  - `app/play/[era-id]/page.tsx` created: nav bar, GameCanvas, live score HUD, trick flash, run-complete overlay
  - Race condition fixed: `game-scene-ready` event ensures `start-run` arrives after GameScene listener registered
  - **Needs browser verification at `http://localhost:3000/play/stx-bull-2021`**
  - Verify: terrain renders, surfer physics work, score increments, run-complete overlay fires

---

## ✅ Milestone M3 — Full Game Loop (Demo Mode) — COMPLETE

**Goal:** All 6 eras playable without wallet. Full run cycle: select → countdown → play → score → post-run screen.

- [x] **T027** — Implement `game/player/TrickSystem.ts`
  - Detect cutback: sharp lean input in wick zone
  - Detect aerial: full rotation (360° angular velocity) while in air
  - Detect tube ride: high velocity + crouched on flat section
  - Emit `trick-landed` via EventBus

- [x] **T028** — Implement `game/scenes/UIScene.ts`
  - Phaser overlay scene (runs parallel to GameScene)
  - Live score display
  - Trick flash animation on landing
  - Progress bar

- [x] **T029** — Implement `components/game/HUD.tsx`
  - React HUD overlay (outside canvas) for WAVE balance, era name
  - Updates on EventBus `score-update`

- [x] **T030** — Implement `components/game/PostRunScreen.tsx`
  - Score count-up animation (Framer Motion)
  - Tricks landed list
  - Personal best comparison
  - WAVE earned display
  - "Mint This Run" button (disabled in demo mode)
  - "Play Again" button

- [x] **T031** — Implement `app/play/page.tsx` (chart selector)
  - Grid of 6 era cards: token, era name, date range, difficulty indicator
  - Era card shows top score on leaderboard (placeholder for now)
  - Click → navigate to `/play/[era-id]`

- [x] **T032** — Implement `app/play/[era-id]/page.tsx`
  - Load OHLC data for era (from `/api/chart-data`)
  - Render `<GameCanvas>` with terrain data
  - Demo mode: run plays but score not submitted on-chain

- [x] **T033** — Implement `app/page.tsx` (landing)
  - Hero: "Ride the chart. Own the moment."
  - How it works: 3-step visual (connect → surf → mint)
  - CTA: "Pick a Chart"
  - Stats: total runs, total NFTs minted (placeholder)

- [x] **T034** — Sound effects (all 6 needed)
  - Launch (jump)
  - Landing (soft)
  - Trick landed
  - Wipeout
  - Score milestone (every 5,000 pts)
  - Background ambient (looping, subtle)
  - Sound toggle in header

---

## ✅ Milestone M4 — Wallet + Contract Integration — COMPLETE

**Goal:** Full onchain run: connect wallet → claim WAVE → start run on-chain → submit score → claim reward.

- [x] **T035** — Implement `hooks/useWaveBalance.ts`
  - `useStacksContract` read-only `get-balance(who)` — returns `bigint | null`
  - Refetch exposed for optimistic updates after faucet/reward

- [x] **T036** — Implement `hooks/useFaucet.ts`
  - `claim-daily` call + `get-last-claim` read for cooldown
  - Block height from `/v2/info` endpoint; `canClaim = currentBlock - lastClaimBlock >= 144`
  - Returns `{ claim, isLoading, canClaim, blocksUntilClaim, currentBlock }`

- [x] **T037** — Implement `hooks/useStartRun.ts`
  - `start-run(tokenId, eraId)` call; polls Hiro API for confirmation
  - Extracts run-id from last 64 hex chars of tx print event value
  - Returns `{ startRun, isLoading, error, runId }`

- [x] **T038** — Implement `lib/score-signer.ts`
  - `buildMsgHash(runId, score, tricks)` — exact contract format:
    `sha256(run-id || serializeCV(uint(score)) || fold-sha256-tricks)`
  - `signScore(mnemonic, runId, score, tricks)` — derives stxPrivateKey via
    `@stacks/wallet-sdk`, signs with `signMessageHashRsv`, returns 65-byte Uint8Array
  - Note: PLANNING.md string format is superseded by deployed contract's binary hash

- [x] **T039** — Implement `hooks/useSubmitScore.ts`
  - `exportMnemonic()` → `signScore()` → `submit-score` call
  - Optimistic WAVE reward calc: `min(floor(score/100) + 100, 10000)`
  - Returns `{ submitScore, isLoading, error }`

- [x] **T040** — Integrate wallet flow into game screen
  - Launch card shown before game starts: "Start Onchain Run (50 WAVE)" + "Play Free"
  - Onchain mode: `start-run` → wait → game starts → `submit-score` auto-fires on `run-complete`
  - Signing/confirming overlay with block-time copy during submission
  - WAVE balance in nav; faucet link when < 50 WAVE

- [x] **T041** — Implement `app/faucet/page.tsx`
  - WAVE balance card + claim button with cooldown blocks countdown
  - `generateWallet()` CTA when no wallet detected
  - Block-time notice during tx; success state with txid

- [x] **T042** — Implement `app/api/profile/route.ts`
  - GET: Supabase lookup by wallet; POST: sig verify → upsert
  - Sig: `sha256("wave-profile:<wallet>:<display_name>")` recovered via `publicKeyFromSignatureRsv`

- [x] **T043** — Implement `app/api/stats/route.ts`
  - GET: Redis totalRuns + totalNfts; POST /increment; POST /invalidate-leaderboard

- [x] **T044** — Implement `hooks/useProfile.ts`
  - Fetches GET /api/profile on wallet load
  - `updateProfile` signs message via mnemonic derivation, posts to API

---

## ✅ Milestone M5 — NFT Mint Flow — COMPLETE

**Goal:** Player can mint a completed run as an NFT. Image generated, uploaded to IPFS, minted on-chain, appears in gallery.

- [x] **T042** — Implement `app/api/mint-image/route.tsx`
  - Edge runtime; `ImageResponse` (next/og) generates 1200×630 NFT card
  - Design: dark bg, accent glow, token badge, tier label, huge score, tricks list, survived status
  - Uploads ArrayBuffer to `https://api.web3.storage/upload` → returns `{ ipfsCid, imageUrl }`

- [x] **T043** — Implement `lib/nft-metadata.ts`
  - `buildMetadata(run, ipfsCid)` → NFT metadata JSON (name, description, image, attributes)

- [x] **T044** — Implement `hooks/useMintRun.ts`
  - Phase enum: `idle → image → minting → done`
  - POST `/api/mint-image` → `mint-nft(runId, ipfsCid, tokenUri)` → refetch `get-last-token-id`
  - `onSave(nft)` callback persists to localStorage via `usePlayerRuns.addNft`

- [x] **T045** — Update `PostRunScreen.tsx`
  - `canMint`: onchain run submitted + survived + waveBalance ≥ 100 WAVE
  - Multi-step button: idle → "Generating NFT image…" → "Confirming on Stacks (~10s)…" → "Minted ✓"
  - Shows NFT preview image + gallery link on success

- [x] **T046** — Implement `hooks/usePlayerRuns.ts`
  - localStorage-based per wallet (`wave:nfts:<address>`)
  - `addNft` called by `useMintRun` after successful mint; `clear` for dev reset
  - Note: Supabase upgrade planned for M6

- [x] **T047** — Implement `app/gallery/page.tsx`
  - Grid of player's minted NFTs; staggered entry animation
  - Each card: image, era name, token, score, tier, trick count, survived status
  - Empty state with "Play now" CTA; wallet notice when disconnected

- [x] **T048** — Implement `app/gallery/[token-id]/page.tsx`
  - Full NFT detail: image, score, tier, tricks list, IPFS CID
  - Share via `navigator.share` (falls back to clipboard copy)
  - "Play again" CTA; not-found state with wallet hint

---

## ✅ Milestone M6 — Leaderboard + All Pages — COMPLETE

**Goal:** All routes live, leaderboard populated from on-chain data.

- [x] **T053** — Implement `hooks/useLeaderboard.ts` + `lib/leaderboard.ts` + `app/api/leaderboard/[era-id]/route.ts`
  - Server lib: Hiro call-read → Redis cache (TTL 60s) → Supabase display-name enrichment
  - API route: thin wrapper over lib; 404 on unknown era
  - Client hook: polls `/api/leaderboard/{eraId}`, auto-refreshes every 60s
  - Note: this version of @stacks/transactions uses serializeCV→string, TupleCV.value[field], BufferCV.value→hex string

- [x] **T050** — Implement `app/leaderboard/page.tsx`
  - Client component; era tabs; `EraLeaderboard` sub-component per tab
  - Connected player's rank callout always shown above the list
  - Links to full era board; empty-state + error state handled

- [x] **T051** — Implement `app/leaderboard/[era-id]/page.tsx`
  - Era header: token badge, date range, description
  - Full ranked list with YOU badge; retry button on error
  - "Updates every 60s · Source: Stacks blockchain" attribution

- [x] **T052** — Update era cards on `/play` with live top scores
  - `app/play/page.tsx` converted to async server component
  - `fetchTopScore` called in parallel for all 6 eras via `Promise.all`
  - Top score shown in muted accent color on each card

- [x] **T053** — Implement `components/layout/Header.tsx`
  - Sticky header: WAVE wordmark · nav links · WAVE balance + address
  - Active link detection via `usePathname`
  - Renders in landing, play list, and leaderboard pages

- [x] **T058** — Landing page stats from Redis
  - `app/page.tsx` fetches `stats:total-runs` + `stats:total-nfts` server-side
  - Stats row rendered below CTA; hidden when both counters are zero

---

## Milestone M7 — Mainnet Deploy + Vercel

**Goal:** Contracts on mainnet, site live, manual QA passed.

- [ ] **T055** — Deploy contracts to Stacks mainnet
  - `clarinet deployments apply --mainnet`
  - Record mainnet addresses in `lib/contracts.ts`
  - Verify on Stacks Explorer

- [ ] **T056** — Configure Vercel project
  - Environment variables: `NEXT_PUBLIC_NETWORK=mainnet`, `WEB3_STORAGE_TOKEN`, deployer address

- [ ] **T057** — Manual QA checklist
  - [ ] Connect Leather wallet
  - [ ] Claim WAVE from faucet
  - [ ] Start run on-chain (STX March 2021)
  - [ ] Complete run, score submits
  - [ ] WAVE reward received
  - [ ] Mint NFT → image generated → IPFS upload → on-chain mint
  - [ ] NFT appears in gallery
  - [ ] Leaderboard updates
  - [ ] All 6 eras playable
  - [ ] Sound toggle works
  - [ ] No console errors in Chrome, Firefox, Safari

- [ ] **T058** — Impeccable final design pass
  - `/impeccable polish the landing page as a brand surface`
  - `/impeccable polish the play/[era-id] game screen as a product surface`
  - `/impeccable polish the leaderboard as a brand surface`
  - `/impeccable polish the gallery as a brand surface`
  - `/impeccable delight the post-run screen`
  - `/impeccable delight the NFT mint success state`
  - `/impeccable audit the faucet page`
  - `/impeccable harden the game screen` (edge cases, error states)
  - Address all P0 and P1 findings before launch

- [ ] **T058** — Announce on Stacks Discord + X

---

## Backlog (v1.1)

- [ ] **B001** — Mobile touch controls + responsive game canvas
- [ ] **B002** — Ghost mode: race a friend's recorded run
- [ ] **B003** — Server-side physics verification (anti-cheat hardening)
- [ ] **B004** — Animated GIF NFT (replay of run)
- [ ] **B005** — Community vote to add new eras
- [ ] **B006** — Xverse wallet support
- [ ] **B007** — Leaderboard prize events (seasonal WAVE rewards)
