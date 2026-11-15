# HEROX 2D Arena

## Status

Approved for implementation by the user's request to build, test, validate, and publish the 2D hero arena.

## Goal

Add a playable, original, side-view HEROX extraction arena where authenticated human players fight in short online 1v1 incursions, collect loot, and earn server-awarded XP and weapons by extracting. Agility, power/strength, vitality, and intellect shape each play style.

## Player experience

- Players sign in with the existing Firebase session, enter matchmaking, and join another human player. No bot is matched into the competitive queue.
- A colorful 2D side-view arena uses platforms, gravity, movement, jump, basic attack, a special power, scattered loot, and active extraction points. A / D or arrow keys move, Space jumps, mouse click or J attacks, Q triggers the equipped power, and E interacts/extracts.
- Agility raises movement speed, power (shown as Força in the arena) increases damage, vitality increases maximum health, and intellect strengthens the power effect.
- Original sentinel and outcast hero silhouettes use authored canvas/vector shapes; the game does not copy Transformice art, characters, or assets.
- A player banks carried loot only by extracting at an active point. Death or disconnect forfeits unextracted loot and never creates an automatic win or reward for the rival.
- The match ends at defeat, extraction, or the time limit. The server settles the result, XP, gold, and deterministic weapon unlock once. Client state cannot grant awards.
- Disconnects forfeit the disconnected player's carried loot and return the remaining player to the lobby after server resolution.

## Scope

- Keep the current campaign and turn-based arena available.
- Add a separate live 1v1 mode and route `/api/herox/arena` using WebSocket with Firebase ID-token authentication.
- Server is authoritative for movement, collisions, attacks, cooldowns, match completion, XP, and weapon inventory.
- Use one Railway process/replica for the initial release because matchmaking rooms are in-memory. Do not claim multi-replica matchmaking support; use a shared room service before scaling replicas.
- Award 15 XP and 5 gold per loot pickup when extracted, plus 25 XP for a completed extraction and a 25 XP combat bonus for a KO. Unlock a curated arena weapon at each 3rd successful extraction, without duplicates.
- Figma file contains editable match HUD, colorful platform arena with crates/loot, integrated lobby menu, backpack, extraction controls, and original vector chibi rodent heroes.

## Out of scope

- 2v2/large teams, ranked seasons, chat, trading, paid upgrades, bots in ranked play, mobile touch controls, and a distributed matchmaking cluster.
- Deleting/migrating existing profiles or resetting the current database.

## Quality and security

- Validate all WebSocket messages, cap message size and input rates, authenticate within a short timeout, use WSS through Railway, and never trust client position/damage/rewards.
- Sanitize player display names for rendering; render through canvas text, not HTML.
- Match state is ephemeral; match results and owned weapon IDs use the existing HEROX persistence repository.
- Avoid per-frame network traffic: clients send changed input state; the server emits snapshots at a bounded tick rate.

## Figma

- Design file: https://www.figma.com/design/JwIKf4G7T9bcPTorWCDGmm
- Frame: `HEROX · Arena 2D · Extraction` (1920 × 1080), editable lobby/menu, extraction HUD, backpack, platforms, loot, and vector-built chibi rodent heroes.

## Acceptance checks

- Unit tests prove attribute-derived stats, jump/floor/platform collision, bounded movement, attack cooldown/range, KO, disconnect behavior, and exactly-once reward/unlock behavior.
- Integration tests prove unauthenticated/malformed socket access is rejected, human matchmaking pairs two players, match updates reach both clients, and the completed reward is persisted once.
- `npm test`, `npm run lint`, and `npm run build` pass.
- Deployed root remains available; health/catalog endpoints work; arena WebSocket handshake rejects missing/invalid tokens and accepts valid authenticated sessions.

