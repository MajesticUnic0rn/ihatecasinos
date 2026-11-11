/**
 * Math regression suite.
 *
 * This site makes quantitative claims about real games. Every published
 * number is checked here against either a closed-form result or a
 * large Monte Carlo run. Run with `npm test`.
 */
import { analyzeMartingale, ruinSurvival, probAheadAfter, betStdDev, kellyFraction } from "../src/lib/stats";
import { runMonteCarlo, binProfits, DEFAULT_CONFIG, HISTOGRAM_BINS } from "../src/lib/sim/engine";
import { BET_TYPES, edgeFor, WHEEL, POCKETS, colorOf, RED_NUMBERS, tableBet, settleTable, LAYOUT_ROWS } from "../src/lib/games/roulette";
import { resolveRoll, canBet, canRemove, onTable, SPOTS, type Spot, type TableState } from "../src/lib/games/crapsTable";
import { evaluate as pokerEval, equity, SCENARIOS, scenarioCards, requiredShare, callEv, RANKING_EXAMPLES } from "../src/lib/games/holdem";
import { basicStrategy, evaluate, HARD, SOFT, PAIRS, UPCARDS } from "../src/lib/games/blackjack";
import { PASS_WIN, pass345Edge, passWithOdds, pMakePoint, WAYS, POINTS } from "../src/lib/games/craps";
import { exactOuts, requiredEquity, modelRake, DEFAULT_RAKE } from "../src/lib/games/poker";
import { parseHand, makeDeck, hiLoValue, RANKS } from "../src/lib/cards";
import { STRATEGY_LIST } from "../src/lib/strategies";
import {
  DEFAULT_COUNT_CONFIG, betAtTrueCount, dealShoe, edgeAtTrueCount,
  roundsPerHour, simulateCounting,
} from "../src/lib/games/counting";
import { makeRng } from "../src/lib/rng";
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

head("BLACKJACK — the Hi-Lo edge model and bet ramp");
near("break-even sits at true count +1", edgeAtTrueCount(1), 0, 1e-12);
near("each true count is worth half a point", edgeAtTrueCount(3) - edgeAtTrueCount(2), 0.005, 1e-12);
near("flat basic strategy is about -0.5%", edgeAtTrueCount(0), -0.005, 1e-12);
ok("ramp bets one unit at or below TC +1",
  betAtTrueCount(-3, 8) === 1 && betAtTrueCount(0, 8) === 1 && betAtTrueCount(1, 8) === 1);
ok("ramp reaches the top of the spread by TC +4", betAtTrueCount(4, 8) === 8);
ok("ramp never exceeds the spread",
  [2, 4, 8, 12, 16].every((sp) => [1,2,3,4,6,10,20].every((tc) => betAtTrueCount(tc, sp) <= sp)));
ok("ramp is monotone in the true count",
  [1,2,3,4,5,6].every((tc, i, a) => i === 0 || betAtTrueCount(a[i], 8) >= betAtTrueCount(a[i-1], 8)));
ok("a flat spread is flat at every count",
  [-2, 0, 3, 9].every((tc) => betAtTrueCount(tc, 1) === 1));

head("BLACKJACK — shoe dealing");
{
  const cfg = { ...DEFAULT_COUNT_CONFIG, decks: 6, penetration: 0.75 };
  const shoe = dealShoe(makeRng("shoe"), cfg);
  ok("the first bet is placed at a count of zero", shoe[0].running === 0);
  ok("rounds are produced", shoe.length > 10);
  ok("dealing stops at the cut card",
    shoe[shoe.length - 1].depth >= 0.74 && shoe[shoe.length - 1].depth <= 0.90,
    `last depth ${(shoe[shoe.length - 1].depth * 100).toFixed(1)}%`);
  ok("decks remaining is always positive", shoe.every((r) => r.decksRemaining > 0));
  ok("true count is the running count over decks left",
    shoe.every((r) => Math.abs(r.trueCount - r.running / r.decksRemaining) < 1e-9));
  ok("every round deals at least two cards per spot plus the dealer",
    shoe.every((r) => r.dealt.length >= 2 * (cfg.otherPlayers + 2)));
  ok("deeper penetration deals more rounds",
    dealShoe(makeRng("s2"), { ...cfg, penetration: 0.85 }).length >
    dealShoe(makeRng("s2"), { ...cfg, penetration: 0.5 }).length);
  ok("more players means fewer rounds per shoe",
    dealShoe(makeRng("s3"), { ...cfg, otherPlayers: 6 }).length <
    dealShoe(makeRng("s3"), { ...cfg, otherPlayers: 0 }).length);
}

head("BLACKJACK — counting economics");
{
  const sim = (over: Partial<typeof DEFAULT_COUNT_CONFIG>) =>
    simulateCounting(makeRng("c"), { ...DEFAULT_COUNT_CONFIG, ...over }, 250);

  near("flat betting reproduces the basic-strategy baseline",
    sim({ spread: 1 }).overallEdge, -0.005, 0.0015);

  const pens = [0.5, 0.67, 0.75, 0.85].map((p) => sim({ penetration: p }));
  ok("deeper penetration strictly raises the hourly rate",
    pens.every((p, i) => i === 0 || p.unitsPerHour > pens[i - 1].unitsPerHour),
    pens.map((p) => p.unitsPerHour.toFixed(3)).join(" -> "));
  ok("a 50% shoe leaves a 1-8 counter losing money", pens[0].overallEdge < 0,
    `${(pens[0].overallEdge * 100).toFixed(3)}%`);
  ok("a 75% shoe puts a 1-8 counter ahead", pens[2].overallEdge > 0,
    `${(pens[2].overallEdge * 100).toFixed(3)}%`);

  const wide = [1, 2, 4, 8, 12].map((sp) => sim({ spread: sp }));
  ok("a wider spread strictly raises the edge",
    wide.every((w, i) => i === 0 || w.overallEdge > wide[i - 1].overallEdge));

  const tables = [0, 2, 4, 6].map((n) => sim({ otherPlayers: n }));
  ok("more players cuts the hourly rate",
    tables.every((t, i) => i === 0 || t.unitsPerHour < tables[i - 1].unitsPerHour),
    tables.map((t) => t.unitsPerHour.toFixed(3)).join(" -> "));
  ok("more players barely moves the edge PER ROUND",
    Math.abs(tables[0].overallEdge - tables[3].overallEdge) < 0.001,
    "the loss is hands per hour, not edge");
  ok("rounds per hour falls with table size",
    roundsPerHour(1) > roundsPerHour(4) && roundsPerHour(4) > roundsPerHour(7));

  ok("fewer decks is a better counting game",
    sim({ decks: 1 }).overallEdge > sim({ decks: 8 }).overallEdge);
  ok("the counter is at a disadvantage most of the time",
    sim({}).pAdvantage < 0.35 && sim({}).pAdvantage > 0.1,
    `${(sim({}).pAdvantage * 100).toFixed(1)}%`);
  ok("true-count distribution sums to 1",
    Math.abs(sim({}).distribution.reduce((a, b) => a + b.share, 0) - 1) < 1e-9);
}

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

/* ---------------- roulette: the playable table ---------------- */
head("ROULETTE TABLE — chips on the felt");
{
  ok("00 is its own straight-up bet", tableBet("n:00").covers("00") && !tableBet("n:00").covers("0"));
  ok("every single number pays 35 to 1 at 5.26%",
    WHEEL.every((p) => Math.abs(edgeFor(tableBet(`n:${p}`)).houseEdge - 2 / 38) < 1e-12));
  ok("layout grid holds 1-36 exactly once",
    LAYOUT_ROWS.flat().sort((a, b) => a - b).join(",") === Array.from({ length: 36 }, (_, i) => i + 1).join(","));
  ok("layout top row is the 3-column", LAYOUT_ROWS[0].every((n) => n % 3 === 0));

  const r = settleTable({ red: 10, "n:7": 5, black: 20, dozen1: 10 }, "7");
  ok("7 pays red, the straight-up 7 and the first dozen",
    r.winners.map((w) => w.key).sort().join(",") === "dozen1,n:7,red");
  near("returned = stakes + winnings on winners", r.returned, (10 + 10) + (5 + 175) + (10 + 20), 1e-9);
  ok("black loses on red 7", r.losers.length === 1 && r.losers[0].key === "black");
  near("staked is the whole table", r.staked, 45, 1e-9);

  const g = settleTable({ red: 10, black: 10, odd: 10, even: 10, low: 10, high: 10 }, "00");
  ok("00 sweeps every even-money bet", g.returned === 0 && g.losers.length === 6);
}

/* ---------------- craps: the whole table ---------------- */
head("CRAPS TABLE — rules");
{
  const T = (bets: TableState["bets"], point: TableState["point"] = null, extra: Partial<TableState> = {}): TableState =>
    ({ point, bets, comePoints: {}, dontComePoints: {}, ...extra });

  let r = resolveRoll(T({ pass: 10, dontPass: 10 }), 3, 4);
  ok("come-out 7: pass wins, don't pass loses", r.returned === 20 && !r.state.bets.pass && !r.state.bets.dontPass);

  r = resolveRoll(T({ pass: 10, dontPass: 10 }), 6, 6);
  ok("come-out 12: pass loses, don't pass ties and stays up",
    r.returned === 0 && !r.state.bets.pass && r.state.bets.dontPass === 10);

  r = resolveRoll(T({ pass: 10, place6: 30, hard8: 10 }), 4, 2);
  ok("come-out 6 sets the point", r.state.point === 6);
  ok("place bets are off on the come-out", r.events.every((e) => e.label !== "Place 6") && r.state.bets.place6 === 30);

  r = resolveRoll(T({ pass: 10, place6: 30 }, 8), 2, 4);
  ok("place 6 works once a point is set and stays up", r.state.bets.place6 === 30);
  near("place 6 pays 7 to 6", r.returned, 35, 1e-9);

  r = resolveRoll(T({ place6: 25 }, 8), 3, 3);
  near("fractions of a cent are kept by the house ($25 on the 6 pays $29.16)", r.returned, 29.16, 1e-9);

  r = resolveRoll(T({ hard8: 10 }, 6), 5, 3);
  ok("an easy 8 kills the hard 8", r.returned === 0 && !r.state.bets.hard8);
  r = resolveRoll(T({ hard8: 10 }, 6), 4, 4);
  near("hard 8 pays 9 to 1 and stays up", r.returned, 90, 1e-9);

  r = resolveRoll(T({ pass: 10, passOdds: 20 }, 4), 2, 2);
  near("making a 4 pays the line 1:1 and the odds 2:1", r.returned, 20 + 60, 1e-9);
  ok("making the point turns it off", r.state.point === null);

  r = resolveRoll(T({ pass: 10, passOdds: 20, place5: 10, dontPass: 10 }, 9), 6, 1);
  ok("seven out: line, odds and place bets lose; don't pass wins",
    r.returned === 20 && !r.state.bets.pass && !r.state.bets.passOdds && !r.state.bets.place5);

  let s = resolveRoll(T({ come: 10 }, 6), 2, 3).state;
  ok("a come bet travels to its number", s.comePoints[5] === 10 && !s.bets.come);
  r = resolveRoll(s, 4, 1);
  ok("…and wins when that number rolls again", r.returned === 20 && !r.state.comePoints[5]);

  s = T({}, 6, { comePoints: { 5: 10 }, dontComePoints: { 9: 10 } });
  r = resolveRoll(s, 3, 4);
  ok("a 7 loses come points and wins don't-come points", r.returned === 20 && !r.state.comePoints[5]);

  r = resolveRoll(T({ field: 10 }), 6, 6);
  near("field pays triple on 12", r.returned, 40, 1e-9);
  r = resolveRoll(T({ field: 10, any7: 5 }), 2, 5);
  ok("one-roll bets come off either way", !r.state.bets.field && !r.state.bets.any7);
  near("any seven pays 4 to 1", r.returned, 25, 1e-9);

  ok("line bets can't go down once a point is set", !canBet(T({}, 6), "pass", 5).ok);
  ok("come bets need a point", !canBet(T({}), "come", 5).ok);
  ok("odds need a pass line bet", !canBet(T({}, 6), "passOdds", 5).ok);
  ok("odds are capped at 5x on a 6", canBet(T({ pass: 10 }, 6), "passOdds", 50).ok && !canBet(T({ pass: 10 }, 6), "passOdds", 55).ok);
  ok("the pass line is a contract once the point is set", !canRemove(T({ pass: 10 }, 6), "pass"));
  ok("…but can come down before the come-out", canRemove(T({ pass: 10 }), "pass"));
  ok("onTable counts travelled come bets", onTable(T({ pass: 5 }, 6, { comePoints: { 8: 10 } })) === 15);
}

head("CRAPS TABLE — every main spot realises its published edge");
{
  const measure = (spot: Spot, rolls: number) => {
    const rng = makeRng("craps-" + spot);
    let st: TableState = { point: null, bets: {}, comePoints: {}, dontComePoints: {} };
    let net = 0, decided = 0;
    for (let i = 0; i < rolls; i++) {
      if (!st.bets[spot] && canBet(st, spot, 30).ok) st = { ...st, bets: { ...st.bets, [spot]: 30 } };
      const res = resolveRoll(st, 1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6));
      for (const e of res.events) {
        if (e.label !== SPOTS[spot].label) continue;
        if (e.outcome === "win") { net += e.won; decided += e.stake; }
        if (e.outcome === "lose") { net -= e.stake; decided += e.stake; }
      }
      st = res.state;
    }
    return -net / decided;
  };
  for (const spot of ["pass", "field", "place6", "place4", "big8", "hard6", "any7", "yo"] as Spot[]) {
    near(`${SPOTS[spot].label} ≈ ${(SPOTS[spot].edge * 100).toFixed(2)}%`, measure(spot, 500_000), SPOTS[spot].edge, 0.012);
  }
}

/* ---------------- poker ---------------- */
head("POKER — hand evaluator");
{
  const cat = (s: string) => pokerEval(parseHand(s)).name;
  const beats = (a: string, b: string) => pokerEval(parseHand(a)).value > pokerEval(parseHand(b)).value;
  ok("royal flush is a straight flush", cat("Ah Kh Qh Jh 10h 2c 3d") === "Straight flush");
  ok("the wheel straight flush counts", cat("Ah 2h 3h 4h 5h Kc Kd") === "Straight flush");
  ok("two sets make a full house", cat("Ks Kh Kd 2c 2s 2h 8d") === "Full house");
  ok("ace-low straight", cat("Ac 2d 3s 4h 5c Kd Kh") === "Straight");
  ok("flush beats straight", beats("Ah Jh 8h 6h 2h Kc Kd", "10c 9d 8s 7h 6c 2d 2h"));
  ok("full house beats flush", beats("Ks Kh Kd 2c 2s 7h 8d", "Ah Jh 8h 6h 2h Kc Qd"));
  ok("kicker decides a shared pair", beats("Ah Kd 9s 9c 2h 3d 5c", "Ah Qd 9s 9c 2h 3d 5c"));
  ok("the wheel loses to a six-high straight", beats("2d 3s 4h 5c 6d Kd Qh", "Ac 2d 3s 4h 5c Kd Qh"));
  ok("when the board plays, it's a tie",
    pokerEval(parseHand("2c 3d Ah Kh Qh Jh 10h")).value === pokerEval(parseHand("4c 5d Ah Kh Qh Jh 10h")).value);
  ok("every ranking example evaluates to its own name",
    RANKING_EXAMPLES.every((r) => pokerEval(parseHand(r.cards)).name === r.name));
}

head("POKER — scenarios teach what they claim");
{
  const want: Record<string, "call" | "fold"> = {
    aces: "call", "flush-draw": "call", gutshot: "fold", "coin-flip": "call", "weak-kicker": "fold",
  };
  for (const sc of SCENARIOS) {
    const { hero, villain, board } = scenarioCards(sc);
    const eq = equity(hero, villain, board, makeRng("t-" + sc.id), 40_000);
    const verdict = callEv(sc, eq) > 0 ? "call" : "fold";
    ok(`${sc.title}: ${want[sc.id]} (equity ${(eq.share * 100).toFixed(1)}%, needs ${(requiredShare(sc) * 100).toFixed(1)}%)`,
      verdict === want[sc.id]);
  }
  const fd = scenarioCards(SCENARIOS[1]);
  ok("flop equity is enumerated exactly", equity(fd.hero, fd.villain, fd.board).exact);
  const aa = scenarioCards(SCENARIOS[0]);
  near("aces vs kings ≈ 81.26% (exact enumeration of all 1.7M boards)",
    equity(aa.hero, aa.villain, aa.board, makeRng("aa"), 60_000).share, 0.81255, 0.006);
}

/* ---------------- summary ---------------- */
console.log(`\n${"=".repeat(52)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
