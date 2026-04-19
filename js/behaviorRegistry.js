// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOR REGISTRY
//
// Each character type registers a behavior object here.
// Square.js reads from this registry — you never need to touch Square or any
// other core file when adding a new character.
//
// A behavior object can define any of these hooks (all are optional):
//
//   initState(square)              → called once in constructor; add your custom
//                                    state props directly onto `square`
//
//   onSpawn(square, side)          → called after initState; use for spawning
//                                    companion entities (e.g. White's companion)
//
//   onTakeDamage(square)           → called every time this square takes damage
//
//   onHitEnemy(square)             → called every time this square deals damage
//                                    via collision
//
//   getCollisionDamage(square)     → return a number; overrides the default
//                                    collision damage calculation (1 + bonusDamage)
//
//   onWallBounce(square)           → called each time the square bounces off a wall
//
//   updateSkill(square)            → called every frame (after movement/bounce);
//                                    put your passive/active skill logic here
//
//   draw(square)                   → called before the square body is drawn;
//                                    use for special visuals (e.g. Violet's beam)
//
// ─────────────────────────────────────────────────────────────────────────────
const BehaviorRegistry = {};

function registerBehavior(type, behavior) {
  BehaviorRegistry[type] = behavior;
}
