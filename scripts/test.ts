/**
 * Math regression suite.
 *
 * This site makes quantitative claims about real games. Every published
 * number is checked here against either a closed-form result or a
 * large Monte Carlo run. Run with `npm test`.
 */
import { analyzeMartingale, ruinSurvival, probAheadAfter, betStdDev, kellyFraction } from "../src/lib/stats";
import { runMonteCarlo, binProfits, DEFAULT_CONFIG, HISTOGRAM_BINS } from "../src/lib/sim/engine";
import { BET_TYPES, edgeFor, WHEEL, POCKETS, colorOf, RED_NUMBERS } from "../src/lib/games/roulette";
import { basicStrategy, evaluate, HARD, SOFT, PAIRS, UPCARDS } from "../src/lib/games/blackjack";
import { PASS_WIN, pass345Edge, passWithOdds, pMakePoint, WAYS, POINTS } from "../src/lib/games/craps";
import { exactOuts, requiredEquity, modelRake, DEFAULT_RAKE } from "../src/lib/games/poker";
import { parseHand, makeDeck, hiLoValue, RANKS } from "../src/lib/cards";
import { STRATEGY_LIST } from "../src/lib/strategies";
import { Y } from "../src/components/three/RouletteWheel";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? "  — " + detail : ""}`); }
};
const near = (name: string, got: number, want: number, tol: number) =>
  ok(name, Math.abs(got - want) <= tol, `got ${got.toFixed(6)}, want ${want.toFixed(6)} ±${tol}`);
const head = (s: string) => console.log(`\n${s}`);

/* ---------------- roulette ---------------- */
head("ROULETTE — wheel integrity (American double-zero only)");
ok("38 unique pockets", new Set(WHEEL).size === 38 && POCKETS === 38);
ok("18 red numbers", RED_NUMBERS.size === 18);
ok("18 black pockets", WHEEL.filter((p) => colorOf(p) === "black").length === 18);
ok("exactly two green pockets", WHEEL.filter((p) => colorOf(p) === "green").length === 2);
ok("the greens are 0 and 00",
  WHEEL.filter((p) => colorOf(p) === "green").sort().join(",") === "0,00");
ok("no numbered pocket is green",
  WHEEL.every((p) => p === "0" || p === "00" || colorOf(p) !== "green"));

head("ROULETTE — every bet is 5.26% except the top line");
for (const b of BET_TYPES) {
  const e = edgeFor(b).houseEdge;
  const want = b.id === "basket" ? 3 / 38 : 2 / 38;
  near(`${b.label}`, e, want, 1e-12);
}
ok("coverCount always matches the predicate",
  BET_TYPES.every((b) => WHEEL.filter((p) => b.covers(p)).length === b.coverCount));
ok("the top line is the single worst bet on the layout",
  BET_TYPES.every((b) => b.id === "basket" || edgeFor(b).houseEdge < edgeFor(BET_TYPES.find((x) => x.id === "basket")!).houseEdge));

head("ROULETTE — 3D wheel vertical stack");
// Regression guard. The pocket colours live on a flat ring at Y.POCKET;
// any solid geometry drawn above that plane hides them, which is exactly
// how the wheel once rendered as a plain brown disc.
ok("bowl sits below the pocket plane", Y.BOWL_TOP < Y.POCKET);
ok("ball track sits below the pocket plane", Y.TRACK < Y.POCKET);
ok("labels sit above the pocket plane", Y.TEXT > Y.POCKET);
ok("labels clear the top of the frets",
  Y.TEXT > Y.FRET_CENTER + Y.FRET_HEIGHT / 2,
  `text ${Y.TEXT} vs fret top ${Y.FRET_CENTER + Y.FRET_HEIGHT / 2}`);
ok("frets start at the pocket surface",
  Math.abs(Y.FRET_CENTER - Y.FRET_HEIGHT / 2 - Y.POCKET) < 1e-9);
ok("a settled ball rests on the pocket surface", Y.BALL_REST > Y.POCKET && Y.BALL_REST < 0.25);

head("ROULETTE — pocket colours match the physical wheel");
ok("every pocket gets exactly one colour",
  WHEEL.filter((p) => colorOf(p) === "red").length +
  WHEEL.filter((p) => colorOf(p) === "black").length +
  WHEEL.filter((p) => colorOf(p) === "green").length === WHEEL.length);
ok("red set matches the canonical 18",
  [...RED_NUMBERS].sort((a, b) => a - b).join(",") ===
  "1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36");
ok("the rendered colour of every pocket agrees with that set",
  WHEEL.every((p) =>
    p === "0" || p === "00"
      ? colorOf(p) === "green"
      : colorOf(p) === (RED_NUMBERS.has(Number(p)) ? "red" : "black")));
ok("the 36 numbered pockets are 1..36 with no gaps or repeats",
  WHEEL.filter((p) => p !== "0" && p !== "00")
    .map(Number).sort((a, b) => a - b).join(",") ===
  Array.from({ length: 36 }, (_, i) => i + 1).join(","));

/* ---------------- martingale & ruin ---------------- */
head("MARTINGALE — the textbook case ($1023, 38 pockets)");
const mg = analyzeMartingale(1023, 18 / 38);
ok("buys exactly 10 doublings", mg.doublings === 10);
ok("total exposure is 1023 units", mg.maxExposure === 1023);
near("P(wipeout) = (20/38)^10", mg.pCatastrophe, Math.pow(20 / 38, 10), 1e-12);
near("wipeout is about 1 in 613", 1 / mg.pCatastrophe, 613, 1);
near("EV per sequence", mg.evPerSequence, -0.6701, 1e-3);
near("EV/stake equals the flat house edge", -mg.evPerSequence / mg.expectedStake, 2 / 38, 1e-9);
{
  // A $5 unit against a $500 table max buys 7 doublings, not 10 — the
  // eighth bet would be $640. This is the real off-switch.
  const capped = analyzeMartingale(1e9, 18 / 38, 100);
  ok("a table limit shrinks the doublings to 7", capped.doublings === 7);
  near("and wipeout odds to about 1 in 89", 1 / capped.pCatastrophe, 89, 1);
}

head("GAMBLER'S RUIN");
near("fair game is proportional", ruinSurvival(40, 100, 0.5), 0.4, 1e-9);
ok("negative edge collapses survival", ruinSurvival(100, 200, 18 / 38) < 0.02);
ok("already at target", ruinSurvival(100, 100, 0.4) === 1);
ok("already broke", ruinSurvival(0, 100, 0.4) === 0);
ok("Kelly says do not bet a negative-edge game", kellyFraction(18 / 38, 1) < 0);
ok("P(ahead) decays with n", probAheadAfter(10000, 2 / 38, betStdDev(18 / 38, 1)) < probAheadAfter(100, 2 / 38, betStdDev(18 / 38, 1)));

/* ---------------- engine ---------------- */
head("ENGINE — flat betting must realise the book edge (Monte Carlo)");
{
  const r = runMonteCarlo({ ...DEFAULT_CONFIG, strategy: "flat", bankroll: 1e7,
    baseUnit: 1, tableMin: 1, tableMax: 1e6, maxBets: 4000, targetProfit: 0, seed: "t-flat" }, 400);
  near("realised edge on an even-money bet", r.realizedEdge, 2 / 38, 0.004);
  const s35 = runMonteCarlo({ ...DEFAULT_CONFIG, betId: "straight", strategy: "flat", bankroll: 1e7,
    baseUnit: 1, tableMin: 1, tableMax: 1e6, maxBets: 6000, targetProfit: 0, seed: "t-35" }, 400);
  near("realised edge on a 35:1 straight-up", s35.realizedEdge, 2 / 38, 0.006);
}
head("ENGINE — no progression can change the realised edge");
// Stakes are capped at 256 units deliberately. Left unbounded, a
// Martingale's stake reaches 2^29 and the profit distribution becomes so
// heavy-tailed that a Monte Carlo mean is meaningless at any feasible
// trial count — the estimator, not the engine, is what fails. Capping the
// stake bounds the tail without changing the theorem being tested:
// EV is linear, so ANY stake rule driven only by past results realises
// exactly the flat house edge.
for (const s of ["martingale", "dalembert", "fibonacci", "paroli", "grand-martingale"] as const) {
  const r = runMonteCarlo({ ...DEFAULT_CONFIG, strategy: s, bankroll: 1e7,
    baseUnit: 1, tableMin: 1, tableMax: 256, maxBets: 2000, targetProfit: 0, seed: `t-${s}` }, 1500);
  near(`${s} realised edge ≈ 5.26%`, r.realizedEdge, 2 / 38, 0.004);
}

head("RACE — shared binning for small multiples");
{
  const sample = Float64Array.from([-10, -5, 0, 5, 10]);
  const bins = binProfits(sample, -10, 10, 4);
  ok("bin count honoured", bins.length === 4);
  ok("every value is binned", bins.reduce((a, b) => a + b.count, 0) === sample.length);
  ok("edges span the domain", bins[0].lo === -10 && Math.abs(bins[3].hi - 10) < 1e-9);
  ok("top value clamps into the last bin", bins[3].count >= 1);
}
{
  // The race re-bins every system onto ONE set of edges. If that ever
  // regresses, the small multiples silently stop being comparable.
  const runs = STRATEGY_LIST.map((st) =>
    runMonteCarlo({ ...DEFAULT_CONFIG, strategy: st.id, seed: "race" }, 400, undefined, true));
  const lo = Math.min(...runs.map((r) => r.worstProfit));
  const hi = Math.max(...runs.map((r) => r.bestProfit));
  const rebinned = runs.map((r) => binProfits(r.profits!, lo, hi));
  const edges = rebinned.map((h) => h.map((b) => b.lo.toFixed(6)).join(","));
  ok("all six systems share identical bin edges", new Set(edges).size === 1);
  ok(`each has ${HISTOGRAM_BINS} bins`, rebinned.every((h) => h.length === HISTOGRAM_BINS));
  ok("re-binning preserves every trial",
    rebinned.every((h, i) => h.reduce((a, b) => a + b.count, 0) === runs[i].profits!.length));
  ok("keepProfits=false leaves no sample attached",
    runMonteCarlo({ ...DEFAULT_CONFIG, seed: "x" }, 50).profits === undefined);
}

head("RACE — the spread across systems is sampling noise, and shrinks");
{
  const theory = edgeFor(BET_TYPES[0]).houseEdge;
  const widthAt = (trials: number) => {
    const es = STRATEGY_LIST.map((st) =>
      runMonteCarlo({ ...DEFAULT_CONFIG, strategy: st.id, seed: "conv" }, trials).realizedEdge);
    return { width: Math.max(...es) - Math.min(...es), maxErr: Math.max(...es.map((e) => Math.abs(e - theory))) };
  };
  const small = widthAt(4_000);
  const large = widthAt(40_000);
  ok(`spread narrows with trials (${(small.width * 100).toFixed(2)}pp -> ${(large.width * 100).toFixed(2)}pp)`,
    large.width < small.width);
  ok(`every system lands within 0.3pp of theory at 40k (max err ${(large.maxErr * 100).toFixed(3)}pp)`,
    large.maxErr < 0.003);
}

/* ---------------- blackjack ---------------- */
head("BLACKJACK — chart integrity");
ok("hard rows cover 5..21", Object.keys(HARD).length === 17);
ok("every hard row has 10 columns", Object.values(HARD).every((r) => r.length === 10));
ok("every soft row has 10 columns", Object.values(SOFT).every((r) => r.length === 10));
ok("every pair row has 10 columns", Object.values(PAIRS).every((r) => r.length === 10));
ok("10 dealer upcards", UPCARDS.length === 10);

head("BLACKJACK — hand evaluation");
ok("A+K is blackjack", evaluate(parseHand("Ah Ks")).blackjack);
ok("A+9+A = 21 soft", evaluate(parseHand("Ah 9s Ad")).total === 21);
ok("A+A+A+A+8 = 12", evaluate(parseHand("Ah As Ad Ac 8h")).total === 12);
ok("K+Q+5 busts at 25", evaluate(parseHand("Kh Qs 5d")).busted);
ok("A+6 is soft 17", evaluate(parseHand("Ah 6s")).soft && evaluate(parseHand("Ah 6s")).total === 17);

head("BLACKJACK — known S17 basic-strategy spots");
const spot = (hand: string, up: string, want: string) =>
  ok(`${hand} vs ${up} → ${want}`, basicStrategy(parseHand(hand), parseHand(up)[0].rank) === want);
spot("10h 6s", "6d", "S");      // stand 16 vs 6
spot("10h 6s", "7d", "H");      // hit 16 vs 7
spot("10h 6s", "10d", "R");     // surrender 16 vs 10
spot("10h 5s", "10d", "R");     // surrender 15 vs 10
spot("6h 5s", "5d", "D");       // double 11 vs 5
spot("6h 5s", "Ad", "H");       // 11 vs A is HIT under S17 (the one everyone gets wrong)
spot("5h 5s", "6d", "D");       // never split 5s — play the hard 10
spot("8h 8s", "10d", "P");      // always split 8s
spot("Ah As", "Ad", "P");       // always split aces
spot("9h 9s", "7d", "S");       // stand 9s vs 7
spot("9h 9s", "8d", "P");       // split 9s vs 8
spot("10h 10s", "6d", "S");     // never split tens
spot("Ah 7s", "3d", "Ds");      // soft 18 doubles vs 3
spot("Ah 7s", "9d", "H");       // soft 18 hits vs 9
spot("Ah 2s", "5d", "D");       // soft 13 doubles vs 5
spot("4h 5s", "3d", "D");       // double 9 vs 3
spot("4h 5s", "2d", "H");       // 9 vs 2 is a hit under S17
spot("2h 10s", "3d", "H");      // 12 vs 3 hits
spot("2h 10s", "4d", "S");      // 12 vs 4 stands
ok("surrender falls back to hit when not allowed",
  basicStrategy(parseHand("10h 6s"), parseHand("10d")[0].rank, { canSurrender: false }) === "H");
ok("double falls back to hit when not allowed",
  basicStrategy(parseHand("6h 5s"), parseHand("5d")[0].rank, { canDouble: false }) === "H");
ok("soft-18 double falls back to STAND when not allowed",
  basicStrategy(parseHand("Ah 7s"), parseHand("3d")[0].rank, { canDouble: false }) === "S");

head("BLACKJACK — counting");
ok("Hi-Lo over a full deck sums to zero", makeDeck().reduce((a, c) => a + hiLoValue(c.rank), 0) === 0);
ok("20 cards are +1", RANKS.filter((r) => hiLoValue(r) === 1).length * 4 === 20);
ok("20 cards are −1", RANKS.filter((r) => hiLoValue(r) === -1).length * 4 === 20);

/* ---------------- craps ---------------- */
head("CRAPS");
ok("ways sum to 36", Object.values(WAYS).reduce((a, b) => a + b, 0) === 36);
near("pass line win probability = 244/495", PASS_WIN, 244 / 495, 1e-12);
near("pass line house edge = 1.414%", 1 - 2 * PASS_WIN, 7 / 495, 1e-12);
near("point 4 is a 1-in-3", pMakePoint(4), 1 / 3, 1e-12);
near("point 6 is 5/11", pMakePoint(6), 5 / 11, 1e-12);
near("pass + 3-4-5x = 0.374%", pass345Edge(), 0.00374, 5e-5);
near("pass + 1x = 0.848%", passWithOdds(1), 0.00848, 5e-5);
near("pass + 2x = 0.606%", passWithOdds(2), 0.00606, 5e-5);
near("pass + 10x = 0.184%", passWithOdds(10), 0.00184, 5e-5);
near("no odds = the bare pass line", passWithOdds(0), 7 / 495, 1e-12);
ok("odds strictly reduce the blended edge",
  POINTS.every(() => passWithOdds(5) < passWithOdds(3) && passWithOdds(3) < passWithOdds(0)));

/* ---------------- poker ---------------- */
head("POKER");
near("flush draw, 2 cards = 34.97%", exactOuts(9, 2), 0.3497, 1e-4);
near("open-ender, 2 cards = 31.45%", exactOuts(8, 2), 0.3145, 1e-4);
near("combo draw, 2 cards = 54.12%", exactOuts(15, 2), 0.5412, 1e-4);
near("flush draw, 1 card = 9/46", exactOuts(9, 1), 9 / 46, 1e-12);
near("pot odds: call 30 into 100 needs 23.08%", requiredEquity(100, 30), 30 / 130, 1e-12);
const rake = modelRake(DEFAULT_RAKE);
ok("live $1/$2 rake lands near 10 BB/100", rake.bbPer100 > 8 && rake.bbPer100 < 12, `got ${rake.bbPer100.toFixed(1)}`);
ok("rake cap binds on a big pot", modelRake({ ...DEFAULT_RAKE, avgPot: 400 }).rakePerPot === DEFAULT_RAKE.cap + DEFAULT_RAKE.toke);

/* ---------------- summary ---------------- */
console.log(`\n${"=".repeat(52)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
