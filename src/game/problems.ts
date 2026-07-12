// 問題生成（DESIGN §7）。シード無しのランダム。
// - たしざん: a≥1, b≥1, a+b≤maxSum → answer = a+b（2..maxSum）
// - ひきざん: a in 2..maxSum, b in 1..a-1 → answer = a−b（1..maxSum-1）
// どちらも answer は 1..maxSum に収まる。選択肢は answer を含む近い数3つをシャッフル。

import { CharDef, Op, Problem } from '../types';

// キャラ表。ask は連濁を含んだ確定文字列（うさぎ・とりは「わ」、水の生き物・けものは「ひき」、
// くだもの・まるいものは「こ」）。増やすときは連濁（なんびき等）に注意。
const CHARS: CharDef[] = [
  { emoji: '🐥', ask: 'なんわ' },
  { emoji: '🐤', ask: 'なんわ' },
  { emoji: '🐦', ask: 'なんわ' },
  { emoji: '🐰', ask: 'なんわ' },
  { emoji: '🐟', ask: 'なんびき' },
  { emoji: '🐠', ask: 'なんびき' },
  { emoji: '🐢', ask: 'なんびき' },
  { emoji: '🐶', ask: 'なんびき' },
  { emoji: '🐱', ask: 'なんびき' },
  { emoji: '🐸', ask: 'なんびき' },
  { emoji: '🍎', ask: 'なんこ' },
  { emoji: '🍓', ask: 'なんこ' },
  { emoji: '🍊', ask: 'なんこ' },
  { emoji: '🍋', ask: 'なんこ' },
  { emoji: '⭐', ask: 'なんこ' },
  { emoji: '🎈', ask: 'なんこ' },
  { emoji: '🍩', ask: 'なんこ' },
  { emoji: '🌸', ask: 'なんこ' },
];

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 選択肢: answer を必ず含み、近い数を優先して計3つ。1..maxSum に収める。
export function makeChoices(answer: number, maxSum: number): number[] {
  const set = new Set<number>([answer]);
  const near = [answer - 1, answer + 1, answer - 2, answer + 2];
  for (const n of near) {
    if (set.size >= 3) break;
    if (n >= 1 && n <= maxSum) set.add(n);
  }
  // 範囲が狭くて足りなければ埋める（安全網）。
  for (let n = 1; n <= maxSum && set.size < 3; n++) set.add(n);
  return shuffle(Array.from(set));
}

export function generateProblem(maxSum: number): Problem {
  const op: Op = Math.random() < 0.5 ? 'add' : 'sub';
  let a: number;
  let b: number;
  let answer: number;
  if (op === 'add') {
    a = randInt(1, maxSum - 1);
    b = randInt(1, maxSum - a);
    answer = a + b;
  } else {
    a = randInt(2, maxSum);
    b = randInt(1, a - 1);
    answer = a - b;
  }
  return { op, a, b, answer, char: pick(CHARS), choices: makeChoices(answer, maxSum) };
}

// 1セット（既定5問）。前問と同じ (op,a,b) の連続だけ軽く避ける（シード固定はしない）。
export function generateSet(maxSum: number, count = 5): Problem[] {
  const out: Problem[] = [];
  let prev: Problem | null = null;
  for (let i = 0; i < count; i++) {
    let p = generateProblem(maxSum);
    let guard = 0;
    while (prev && p.op === prev.op && p.a === prev.a && p.b === prev.b && guard < 8) {
      p = generateProblem(maxSum);
      guard++;
    }
    out.push(p);
    prev = p;
  }
  return out;
}