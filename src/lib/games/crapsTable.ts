/**
 * The whole craps table, as a pure state machine.
 *
 * One roll in, a new table state and a list of what happened out. No
 * React, no randomness — the dice are an input — so every rule here is
 * testable on its own and the house edge of each spot can be measured
 * by Monte Carlo against the published figure.
 *
 * House rules modelled (the common US defaults):
 * - Place bets and hardways are OFF on the come-out roll.
 * - Big 6 / Big 8 always work.
 * - Line bets can only go down on the come-out; come bets only once a
 *   point is set.
 * - Free odds go behind the pass line at up to 3-4-5×.
 * - Place and hardway bets STAY UP after a win (only the winnings come
 *   back); line, come and one-roll bets settle and come off.
 * - Fractions of a cent are rounded down, the way a casino pays.
 */

export type Spot =
  | "pass"
  | "passOdds"
  | "dontPass"
  | "come"
  | "dontCome"
  | "field"
  | "place4"
  | "place5"
  | "place6"
  | "place8"
  | "place9"
  | "place10"
  | "big6"
  | "big8"
  | "hard4"
  | "hard6"
  | "hard8"
  | "hard10"
  | "any7"
  | "anyCraps"
  | "yo"
  | "aces"
  | "aceDeuce"
  | "boxcars";

export const POINT_NUMBERS = [4, 5, 6, 8, 9, 10] as const;
export type PointNumber = (typeof POINT_NUMBERS)[number];

export interface SpotInfo {
  label: string;
  pays: string;
  /** House edge per resolved bet, as published. */
  edge: number;
  rule: string;
}

export const SPOTS: Record<Spot, SpotInfo> = {
  pass: { label: "Pass line", pays: "1 to 1", edge: 0.0141,
    rule: "First roll: 7 or 11 wins, 2, 3 or 12 loses. Anything else becomes the point — roll it again before a 7 to win." },
  passOdds: { label: "Odds", pays: "true odds", edge: 0,
    rule: "Extra bet behind the pass line once a point is set. Pays exactly what the odds say — the house takes nothing." },
  dontPass: { label: "Don't pass", pays: "1 to 1", edge: 0.0136,
    rule: "The opposite of the pass line. First roll: 2 or 3 wins, 7 or 11 loses, 12 is a tie. Then you want a 7 before the point." },
  come: { label: "Come", pays: "1 to 1", edge: 0.0141,
    rule: "A fresh pass-line bet made after the point is set. The next roll becomes its own point." },
  dontCome: { label: "Don't come", pays: "1 to 1", edge: 0.0136,
    rule: "A fresh don't-pass bet made after the point is set." },
  field: { label: "Field", pays: "1 to 1 · 2 pays 2× · 12 pays 3×", edge: 0.0278,
    rule: "One roll. Wins on 2, 3, 4, 9, 10, 11 or 12. Loses on 5, 6, 7 or 8 — which happen more often." },
  place4: { label: "Place 4", pays: "9 to 5", edge: 0.0667,
    rule: "Wins if a 4 rolls before a 7. Off on the first roll. Stays up after it wins." },
  place5: { label: "Place 5", pays: "7 to 5", edge: 0.04,
    rule: "Wins if a 5 rolls before a 7. Off on the first roll. Stays up after it wins." },
  place6: { label: "Place 6", pays: "7 to 6", edge: 0.0152,
    rule: "Wins if a 6 rolls before a 7. Off on the first roll. Stays up after it wins." },
  place8: { label: "Place 8", pays: "7 to 6", edge: 0.0152,
    rule: "Wins if an 8 rolls before a 7. Off on the first roll. Stays up after it wins." },
  place9: { label: "Place 9", pays: "7 to 5", edge: 0.04,
    rule: "Wins if a 9 rolls before a 7. Off on the first roll. Stays up after it wins." },
  place10: { label: "Place 10", pays: "9 to 5", edge: 0.0667,
    rule: "Wins if a 10 rolls before a 7. Off on the first roll. Stays up after it wins." },
  big6: { label: "Big 6", pays: "1 to 1", edge: 0.0909,
    rule: "Exactly the same bet as Place 6, paying 1 to 1 instead of 7 to 6. Bigger box, worse price." },
  big8: { label: "Big 8", pays: "1 to 1", edge: 0.0909,
    rule: "Exactly the same bet as Place 8, paying 1 to 1 instead of 7 to 6." },
  hard4: { label: "Hard 4", pays: "7 to 1", edge: 0.1111,
    rule: "Wins on 2-2 before a 7 or any other 4. Off on the first roll." },
  hard6: { label: "Hard 6", pays: "9 to 1", edge: 0.0909,
    rule: "Wins on 3-3 before a 7 or any other 6. Off on the first roll." },
  hard8: { label: "Hard 8", pays: "9 to 1", edge: 0.0909,
    rule: "Wins on 4-4 before a 7 or any other 8. Off on the first roll." },
  hard10: { label: "Hard 10", pays: "7 to 1", edge: 0.1111,
    rule: "Wins on 5-5 before a 7 or any other 10. Off on the first roll." },
  any7: { label: "Any seven", pays: "4 to 1", edge: 0.1667,
    rule: "One roll. Wins on any 7 — a 1-in-6 shot paid as if it were 1 in 5. The worst bet on the table." },
  anyCraps: { label: "Any craps", pays: "7 to 1", edge: 0.1111,
    rule: "One roll. Wins on 2, 3 or 12." },
  yo: { label: "Yo (11)", pays: "15 to 1", edge: 0.1111,
    rule: "One roll. Wins on 11 — 2 ways in 36." },
  aces: { label: "Aces (2)", pays: "30 to 1", edge: 0.1389,
    rule: "One roll. Wins on 1-1 — 1 way in 36." },
  aceDeuce: { label: "Ace-deuce (3)", pays: "15 to 1", edge: 0.1111,
    rule: "One roll. Wins on 3 — 2 ways in 36." },
  boxcars: { label: "Boxcars (12)", pays: "30 to 1", edge: 0.1389,
    rule: "One roll. Wins on 6-6 — 1 way in 36." },
};

export interface TableState {
  point: PointNumber | null;
  bets: Partial<Record<Spot, number>>;
  /** Come bets that have travelled to a number. */
  comePoints: Partial<Record<PointNumber, number>>;
  dontComePoints: Partial<Record<PointNumber, number>>;
}

export const EMPTY_TABLE: TableState = {
  point: null,
  bets: {},
  comePoints: {},
  dontComePoints: {},
};

export interface RollEvent {
  label: string;
  outcome: "win" | "lose" | "push" | "move";
  stake: number;
  /** Profit on a win, 0 otherwise. */
  won: number;
}

export interface RollResult {
  state: TableState;
  events: RollEvent[];
  /** Money that goes back to the player's rack this roll. */
  returned: number;
  /** Plain-English line for the dealer's call. */
  call: string;
}

const PLACE_PAY: Record<PointNumber, [number, number]> = {
  4: [9, 5], 10: [9, 5], 5: [7, 5], 9: [7, 5], 6: [7, 6], 8: [7, 6],
};
const ODDS_PAY: Record<PointNumber, [number, number]> = {
  4: [2, 1], 10: [2, 1], 5: [3, 2], 9: [3, 2], 6: [6, 5], 8: [6, 5],
};
const MAX_ODDS: Record<PointNumber, number> = {
  4: 3, 10: 3, 5: 4, 9: 4, 6: 5, 8: 5,
};

/** Casinos pay in whole cents and keep the remainder. */
const pay = (stake: number, [num, den]: [number, number]) =>
  Math.floor(((stake * num) / den) * 100) / 100;

const isPoint = (n: number): n is PointNumber =>
  (POINT_NUMBERS as readonly number[]).includes(n);

/* ------------------------------------------------------------------ */
/* What you're allowed to do                                           */
/* ------------------------------------------------------------------ */

export function maxPassOdds(state: TableState): number {
  if (state.point === null) return 0;
  return (state.bets.pass ?? 0) * MAX_ODDS[state.point];
}

export function canBet(
  state: TableState,
  spot: Spot,
  amount: number,
): { ok: boolean; reason?: string } {
  const comeOut = state.point === null;
  if ((spot === "pass" || spot === "dontPass") && !comeOut)
    return { ok: false, reason: "Line bets go down before the come-out roll." };
  if ((spot === "come" || spot === "dontCome") && comeOut)
    return { ok: false, reason: "Come bets open once a point is set." };
  if (spot === "passOdds") {
    if (comeOut) return { ok: false, reason: "Odds open once a point is set." };
    if (!state.bets.pass) return { ok: false, reason: "Odds need a pass line bet." };
    const room = maxPassOdds(state) - (state.bets.passOdds ?? 0);
    if (amount > room)
      return { ok: false, reason: `Odds are capped at ${MAX_ODDS[state.point!]}× your pass line here.` };
  }
  return { ok: true };
}

export function canRemove(state: TableState, spot: Spot): boolean {
  if (!state.bets[spot]) return false;
  // Once the point is set the pass line is a contract — it stays.
  if (spot === "pass" && state.point !== null) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* The roll                                                            */
/* ------------------------------------------------------------------ */

export function resolveRoll(prev: TableState, d1: number, d2: number): RollResult {
  const t = d1 + d2;
  const hard = d1 === d2;
  const comeOut = prev.point === null;

  const bets: Partial<Record<Spot, number>> = { ...prev.bets };
  const comePoints = { ...prev.comePoints };
  const dontComePoints = { ...prev.dontComePoints };
  const events: RollEvent[] = [];
  let returned = 0;

  const win = (spot: Spot | string, stake: number, won: number, stays: boolean) => {
    const label = typeof spot === "string" && spot in SPOTS ? SPOTS[spot as Spot].label : spot;
    events.push({ label, outcome: "win", stake, won });
    returned += stays ? won : stake + won;
  };
  const lose = (label: string, stake: number) =>
    events.push({ label, outcome: "lose", stake, won: 0 });

  /* ---- one-roll bets ---- */
  const oneRoll: [Spot, boolean, [number, number]][] = [
    ["any7", t === 7, [4, 1]],
    ["anyCraps", t === 2 || t === 3 || t === 12, [7, 1]],
    ["yo", t === 11, [15, 1]],
    ["aces", t === 2, [30, 1]],
    ["aceDeuce", t === 3, [15, 1]],
    ["boxcars", t === 12, [30, 1]],
  ];
  for (const [spot, hit, odds] of oneRoll) {
    const s = bets[spot];
    if (!s) continue;
    if (hit) win(spot, s, pay(s, odds), false);
    else lose(SPOTS[spot].label, s);
    delete bets[spot];
  }

  const field = bets.field;
  if (field) {
    if (t === 2) win("field", field, pay(field, [2, 1]), false);
    else if (t === 12) win("field", field, pay(field, [3, 1]), false);
    else if ([3, 4, 9, 10, 11].includes(t)) win("field", field, field, false);
    else lose(SPOTS.field.label, field);
    delete bets.field;
  }

  /* ---- Big 6 / 8: always working, stay up ---- */
  for (const [spot, n] of [["big6", 6], ["big8", 8]] as const) {
    const s = bets[spot];
    if (!s) continue;
    if (t === n) win(spot, s, s, true);
    else if (t === 7) { lose(SPOTS[spot].label, s); delete bets[spot]; }
  }

  /* ---- place bets and hardways: off on the come-out ---- */
  if (!comeOut) {
    for (const n of POINT_NUMBERS) {
      const spot = `place${n}` as Spot;
      const s = bets[spot];
      if (!s) continue;
      if (t === n) win(spot, s, pay(s, PLACE_PAY[n]), true);
      else if (t === 7) { lose(SPOTS[spot].label, s); delete bets[spot]; }
    }
    for (const [spot, n, odds] of [
      ["hard4", 4, [7, 1]], ["hard6", 6, [9, 1]],
      ["hard8", 8, [9, 1]], ["hard10", 10, [7, 1]],
    ] as const) {
      const s = bets[spot];
      if (!s) continue;
      if (t === n && hard) win(spot, s, pay(s, odds as [number, number]), true);
      else if (t === n || t === 7) { lose(SPOTS[spot].label, s); delete bets[spot]; }
    }
  }

  /* ---- come points that have already travelled (always working) ---- */
  for (const n of POINT_NUMBERS) {
    const c = comePoints[n];
    if (c) {
      if (t === n) { win(`Come on ${n}`, c, c, false); delete comePoints[n]; }
      else if (t === 7) { lose(`Come on ${n}`, c); delete comePoints[n]; }
    }
    const dc = dontComePoints[n];
    if (dc) {
      if (t === 7) { win(`Don't come on ${n}`, dc, dc, false); delete dontComePoints[n]; }
      else if (t === n) { lose(`Don't come on ${n}`, dc); delete dontComePoints[n]; }
    }
  }

  /* ---- fresh come / don't come bets travel or settle ---- */
  const come = bets.come;
  if (come) {
    if (t === 7 || t === 11) win("come", come, come, false);
    else if (t === 2 || t === 3 || t === 12) lose(SPOTS.come.label, come);
    else if (isPoint(t)) {
      comePoints[t] = (comePoints[t] ?? 0) + come;
      events.push({ label: `Come moves to ${t}`, outcome: "move", stake: come, won: 0 });
    }
    delete bets.come;
  }
  const dontCome = bets.dontCome;
  if (dontCome) {
    if (t === 2 || t === 3) { win("dontCome", dontCome, dontCome, false); delete bets.dontCome; }
    else if (t === 7 || t === 11) { lose(SPOTS.dontCome.label, dontCome); delete bets.dontCome; }
    else if (t === 12) events.push({ label: "Don't come (12 is a tie)", outcome: "push", stake: dontCome, won: 0 });
    else if (isPoint(t)) {
      dontComePoints[t] = (dontComePoints[t] ?? 0) + dontCome;
      events.push({ label: `Don't come moves to ${t}`, outcome: "move", stake: dontCome, won: 0 });
      delete bets.dontCome;
    }
  }

  /* ---- the line ---- */
  let point = prev.point;
  let call: string;

  if (comeOut) {
    const pass = bets.pass;
    const dp = bets.dontPass;
    if (t === 7 || t === 11) {
      if (pass) { win("pass", pass, pass, false); delete bets.pass; }
      if (dp) { lose(SPOTS.dontPass.label, dp); delete bets.dontPass; }
      call = `${t} — winner on the pass line.`;
    } else if (t === 2 || t === 3 || t === 12) {
      if (pass) { lose(SPOTS.pass.label, pass); delete bets.pass; }
      if (dp) {
        if (t === 12) events.push({ label: "Don't pass (12 is a tie)", outcome: "push", stake: dp, won: 0 });
        else { win("dontPass", dp, dp, false); delete bets.dontPass; }
      }
      call = `${t} — craps. Pass line loses.`;
    } else {
      point = t as PointNumber;
      call = `The point is ${t}. Roll it again before a 7.`;
    }
  } else {
    const pass = bets.pass;
    const odds = bets.passOdds;
    const dp = bets.dontPass;
    if (t === prev.point) {
      if (pass) { win("pass", pass, pass, false); delete bets.pass; }
      if (odds) { win("passOdds", odds, pay(odds, ODDS_PAY[prev.point]), false); delete bets.passOdds; }
      if (dp) { lose(SPOTS.dontPass.label, dp); delete bets.dontPass; }
      point = null;
      call = `${t} — point made! Pass line wins.`;
    } else if (t === 7) {
      if (pass) { lose(SPOTS.pass.label, pass); delete bets.pass; }
      if (odds) { lose(SPOTS.passOdds.label, odds); delete bets.passOdds; }
      if (dp) { win("dontPass", dp, dp, false); delete bets.dontPass; }
      point = null;
      call = "Seven out. The table clears.";
    } else {
      call = `${t}${hard && t !== 2 && t !== 12 ? " the hard way" : ""}. Still looking for ${prev.point}.`;
    }
  }

  return { state: { point, bets, comePoints, dontComePoints }, events, returned, call };
}

/** Total money currently sitting on the felt. */
export function onTable(state: TableState): number {
  const sum = (o: Partial<Record<string, number>>) =>
    Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
  return sum(state.bets) + sum(state.comePoints) + sum(state.dontComePoints);
}
