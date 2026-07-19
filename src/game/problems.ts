// つづきもの（連鎖）出題の生成（DESIGN §15）。シード無しのランダム。
//
// 1セット5問＝ひとつづきのお話。セット開始時に動物種を1つ選び、5問とも同じ種・同じ助数詞で通す。
// 各問の「開始数（before）」は前問の答え（answer）。第1問だけ最初のグループ initialCount から始まる。
// - たしざん（ふえる）: answer = before + delta（before+delta ≤ maxSum、delta≥1）
// - ひきざん（へる）  : answer = before − delta（answer ≥ 1、delta≥1）
// どちらも answer は 1..maxSum に収まる。選択肢は answer を含む近い数3つをシャッフル。
// 同じ演算が3連続以上続かない程度の揺らぎを入れ、たし・ひきを混ぜる。

import { CharDef, Op, Step, StorySet } from '../types';

// キャラ表。ask は連濁を含んだ確定文字列（うさぎ・とりは「わ」、水の生き物・けものは「ひき」、
// くだもの・まるいものは「こ」）。増やすときは連濁（なんびき等）に注意。
// svg はシールポップ画風の素材（assets/svg/。INDEX.md 参照）。emoji は控え（音声・意味の記録）。
const CHARS: CharDef[] = [
  { emoji: '🐥', ask: 'なんわ', svg: require('../../assets/svg/hiyoko.svg') },
  { emoji: '🐤', ask: 'なんわ', svg: require('../../assets/svg/piyo.svg') },
  { emoji: '🐦', ask: 'なんわ', svg: require('../../assets/svg/tori.svg') },
  { emoji: '🐰', ask: 'なんわ', svg: require('../../assets/svg/usagi.svg') },
  { emoji: '🐟', ask: 'なんびき', svg: require('../../assets/svg/sakana.svg') },
  { emoji: '🐠', ask: 'なんびき', svg: require('../../assets/svg/nettaigyo.svg') },
  { emoji: '🐢', ask: 'なんびき', svg: require('../../assets/svg/kame.svg') },
  { emoji: '🐶', ask: 'なんびき', svg: require('../../assets/svg/inu.svg') },
  { emoji: '🐱', ask: 'なんびき', svg: require('../../assets/svg/neko.svg') },
  { emoji: '🐸', ask: 'なんびき', svg: require('../../assets/svg/kaeru.svg') },
  { emoji: '🍎', ask: 'なんこ', svg: require('../../assets/svg/ringo.svg') },
  { emoji: '🍓', ask: 'なんこ', svg: require('../../assets/svg/ichigo.svg') },
  { emoji: '🍊', ask: 'なんこ', svg: require('../../assets/svg/mikan.svg') },
  { emoji: '🍋', ask: 'なんこ', svg: require('../../assets/svg/remon.svg') },
  { emoji: '⭐', ask: 'なんこ', svg: require('../../assets/svg/hoshi.svg') },
  { emoji: '🎈', ask: 'なんこ', svg: require('../../assets/svg/fuusen.svg') },
  { emoji: '🍩', ask: 'なんこ', svg: require('../../assets/svg/doonatsu.svg') },
  { emoji: '🌸', ask: 'なんこ', svg: require('../../assets/svg/sakura.svg') },
];

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
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

// delta（増減の大きさ）は小さめに寄せる（変化を1匹ずつ見せられるように）。
// 1..maxAvail の範囲で、上限は cap（maxSum が小さいときはさらに小さく）でおさえる。
function pickDelta(maxAvail: number, maxSum: number): number {
  const cap = Math.min(maxAvail, maxSum <= 5 ? 3 : maxSum <= 10 ? 4 : 5);
  // 1〜2 を出やすくする軽い偏り（大きな飛びを減らす）。
  const r = Math.random();
  if (cap >= 2 && r < 0.5) return randInt(1, Math.min(2, cap));
  return randInt(1, cap);
}

// 1セット（既定5問）＝ひとつづきのお話を作る。
// prevChar を渡すと、それと別の種を選ぶ（セットごとに主役が変わる感を出す）。
export function generateStorySet(maxSum: number, count = 5, prevChar?: CharDef): StorySet {
  // 主役の種を選ぶ（直前セットと別種に）。
  const pool = prevChar ? CHARS.filter((c) => c.svg !== prevChar.svg) : CHARS;
  const char = pool[Math.floor(Math.random() * pool.length)];

  // 20まで は、お話の途中で必ず10をまたいで2桁の数を体験させたい。
  // 生成は確率的なので maxCount≥11 になるまで作り直す（期待 約1.3 回・上限つき安全網）。
  const needTwoDigit = maxSum >= 20;

  let initialCount = 0;
  let steps: Step[] = [];
  let maxCount = 0;
  for (let attempt = 0; ; attempt++) {
    // 最初のグループ数。増減どちらにも動ける中ほどから始める（2..maxSum-1）。
    // 20まで は 7..14 から始める。
    initialCount = maxSum >= 20 ? randInt(7, 14) : randInt(2, Math.max(2, maxSum - 1));

    steps = [];
    let before = initialCount;
    maxCount = initialCount;
    // 直前2問の演算（3連続同一を避けるため）。
    const recent: Op[] = [];

    for (let i = 0; i < count; i++) {
      const canAdd = before < maxSum; // まだ増やせる（before+1 ≤ maxSum）
      const canSub = before > 1; // まだ減らせる（before−1 ≥ 1）

      // 候補の演算。直前2問が同じ演算なら、可能なら反対の演算にして3連続を避ける。
      let op: Op;
      const both = canAdd && canSub;
      const sameStreak = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2];
      if (!canAdd) {
        op = 'sub';
      } else if (!canSub) {
        op = 'add';
      } else if (sameStreak) {
        op = recent[recent.length - 1] === 'add' ? 'sub' : 'add';
      } else if (both) {
        op = Math.random() < 0.5 ? 'add' : 'sub';
      } else {
        op = canAdd ? 'add' : 'sub';
      }

      let delta: number;
      let answer: number;
      if (op === 'add') {
        delta = pickDelta(maxSum - before, maxSum);
        answer = before + delta;
      } else {
        delta = pickDelta(before - 1, maxSum);
        answer = before - delta;
      }

      steps.push({ op, before, delta, answer, choices: makeChoices(answer, maxSum) });
      recent.push(op);
      if (answer > maxCount) maxCount = answer;
      before = answer;
    }

    // 2桁到達（maxCount≥11）を満たすか、上限に達したら確定。
    if (!needTwoDigit || maxCount >= 11 || attempt >= 40) break;
  }

  return { char, initialCount, steps, maxCount };
}
