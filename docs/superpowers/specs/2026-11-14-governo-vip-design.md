# GOVERNO VIP Guild

## Intent

Provision the online guild **GOVERNO** for the existing verified online account displayed as `XX MALTA` (matched by its server account ID, not a changeable display name). Make that account its only founding member and leader, set every guild building to level 5, and grant permanent +50% gold and XP on rewards.

## Behavior

- The authoritative game server creates or reconciles this guild during startup when the matching account is already persisted, and also on account bootstrap. The guild record is persisted with the existing online state.
- Guild recruitment is closed, so the exclusive owner perk cannot be shared with other players.
- If the name is already held by another guild, leave that guild untouched and log the provisioning conflict.
- Permanent bonuses are guild data and are included in server-computed reward amounts. They apply to arena, expeditions, dungeons, offline patrol, contracts, item sales, and overflow item sales. Existing timed library scrolls add to the permanent bonus; offline patrol applies that temporary portion proportionally to its active duration.
- Normal guilds keep their existing rules and limits. Do not change other accounts or ranking data.

## Constraints

- Keep the reward authority on the server and never accept bonus values from client action parameters.
- Do not copy player data, identity tokens, or credentials into documentation.
- No tests are added or run for this change.

## Approaches

1. Create an ordinary guild through the player UI and pay for upgrades: cannot provide permanent +50% in every reward path.
2. Add server-owned VIP guild provisioning and persistent guild bonus fields: selected because it supports max levels, account-specific ownership, and authoritative reward math.

