# Square Fight

A browser-based 2-player arena brawler where colourful squares with unique abilities battle it out in real time. No installation required — just open `index.html` in any modern browser.

---

## Gameplay

Two players each pick a square from the roster, then fight inside a walled arena. Squares bounce around the arena and deal damage on collision. Each square has a **passive ability** that evolves throughout the match — stacking buffs, spawning hazards, inflicting status effects, or fundamentally changing how it moves. Matches end when one square's HP reaches zero.

### Controls

| Action | Player 1 | Player 2 |
|---|---|---|
| Chase enemy | `Z` | `J` |
| Speed boost | `X` | `K` |
| Stop / brake | `C` | `L` |
| Reset battle | `R` | `R` |

Use **CHANGE SQUARES** (bottom-left) to return to character select mid-session, or **RESET BATTLE** to restart the current matchup.

---

## Roster

| # | Square | Ability |
|---|---|---|
| 1 | **Red** | Every direct collision grants +1 Permanent Damage and +1 Power. |
| 2 | **Green** | Shoots a growing burst of projectiles every 3 s. Each hit on the enemy permanently adds +1 projectile to the next burst. |
| 3 | **Blue** | When hit, gains +4 HP, +8 px Size, and +1 Damage. (4 s cooldown) |
| 4 | **Yellow** | Speed increases with every wall bounce. Hitting the enemy permanently raises the speed cap. Starting damage scales with current speed. |
| 5 | **White** | Spawns a companion square. Hitting White buffs the companion's speed and raises its damage by +1. Companion deals 3 damage on contact. |
| 6 | **Cyan** | Every 6.5 s, a giant square crashes in from outside the arena and targets the enemy for 12 damage. |
| 7 | **Purple** | Hits apply Poison (2 dmg/s). Every 4th wall/enemy bounce adds +1 s to poison duration permanently. |
| 8 | **Violet** | Every 5 s, stops to charge a high-precision laser. Deals 20 damage on hit. Taking damage resets the charge. |
| 9 | **Orange** | Wall bounces fire an expanding square pulse that deals 2 damage to anything it touches. |
| 10 | **Indigo** | Shoots projectiles every 2 s (1 dmg). Projectiles bounce off walls and transform into 1-HP copies after 1 s. |
| 11 | **Pink** | Bouncing projectiles accumulate Delayed Damage (+1 per wall bounce). Hitting the enemy triggers a pulse that releases all stacked damage. (8 s cooldown) |
| 12 | **Brown** | Wall bounces place a spike on that wall. Enemies touching spikes take 1 damage. Each enemy hit permanently increases Brown's knockback. |
| 13 | **Sky** | Wall bounces create a clone (3 s cooldown). Clones deal 1 dmg on contact, scaling up by +1 for each enemy hit. |
| 14 | **Lime** | Fires a slow bouncing projectile trailing a tether. Hooking the enemy reels them in; each bounce while pulled deals escalating damage. (5 s cooldown after pull) |
| 15 | **Scarlet** | Clashes apply 3 s Bleed (1 dmg/s). Every 3 s, fires a fast bullet that instantly detonates all active Bleed on hit. |
| 16 | **Gray** | Every 0.3 s, leaves a static clone (lasts 1.5 s). Enemies that touch a clone are Frozen for 3 s and take 10 bonus damage when hit while frozen. Slightly faster than other squares. |
| 17 | **Gold** | Every 10 s, drops a construct (max 3). Constructs heal Gold +2 HP whenever the enemy collides with them. Oldest construct is removed when the limit is exceeded. |
| 18 | **Mist** | Shoots 3 projectiles in a narrow arc every 2 s (1 dmg each). After 3 hits on the enemy, teleports to a random free spot in the arena. |

---

## Project Structure

```
square_fight/
├── index.html              # Entry point — loads all scripts and renders HUD/UI
├── css/
│   └── style.css           # All styles: HUD, character select, arena, effects
└── js/
    ├── constants.js        # Game-wide constants (speeds, sizes, cooldowns) and character definitions
    ├── state.js            # Global mutable state (entity lists, game flags, arena bounds)
    ├── utils.js            # Shared helper functions
    ├── effects.js          # Visual effects: particles, floating text, beams, pulses
    ├── entities.js         # Entity classes: Projectile, GiantSquare, Companion, Clone, Spike, etc.
    ├── behaviorRegistry.js # Registry system — maps character type strings to behavior hooks
    ├── characters.js       # Per-character ability logic (hooks: initState, updateSkill, onHitEnemy, etc.)
    ├── square.js           # Square class — movement, physics, collision response, rendering
    ├── collision.js        # Collision detection and resolution between all entity types
    ├── ui.js               # Character select screen rendering and HUD updates
    └── game.js             # Main game loop, reset logic, win condition
```

Scripts are loaded in dependency order at the bottom of `index.html`.

---

## How to Run

No build step or server required.

```bash
# Clone or unzip the project, then just open the file:
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or drag `index.html` into any modern browser window (Chrome, Firefox, Edge, Safari).

---

## Adding a New Character

1. Add an entry to `squareDefs` in `constants.js` with a unique id, name, color, type string, and description.
2. Call `registerBehavior("yourtype", { ... })` in `characters.js` with any combination of the hooks below.
3. The character will automatically appear in the selection grid.

### Available Behavior Hooks

| Hook | Called when… |
|---|---|
| `initState(s)` | Square is created — initialise any custom state properties here |
| `updateSkill(s)` | Every frame during battle — tick timers, fire abilities |
| `onHitEnemy(s)` | This square makes contact with the enemy |
| `onTakeDamage(s)` | This square receives damage |
| `onWallBounce(s)` | This square bounces off an arena wall |
| `onSpawn(s, side)` | Immediately after the square is placed (`"left"` or `"right"`) |
| `getCollisionDamage(s)` | Return a custom damage value for direct clashes |
