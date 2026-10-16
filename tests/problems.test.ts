// src/game/problems.ts の現状固定。DESIGN §15（つづきもの出題）の不変条件と、§7 の選択肢。
//
// 出題はランダムなので、乱数を種つきの列に置き換えて回す（毎回同じ列 = テストはぶれない）。
//   - 不変条件: maxSum 5・10・20 のそれぞれで 2,000 セット（1 セット 5 問）を作り、全部に同じ検査をかける。
//     検査するのは『どの乱数列でも必ず成り立つ』ことだけ。『1..3 がすべて出る』のような網羅の確認は、
//     標本が範囲の端まで届いていて検査が空振りしていないことの確認で、この種の標本に対して決まる。
//   - 最後のブロック（読める例と指紋）は『同じ乱数列なら同じお話』の固定。演算の選び方や乱数の使い方を
//     整理しても挙動が変わらないことを確かめる土台（監査 S-13）。意図して挙動を変えたときだけ更新する。

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  seededRandom as seeded,
  withRandom,
} from "@kerokero-1245/piyo-assets/testing/random";
import { generateStorySet, makeChoices } from "../src/game/problems";
import type { CharDef, StorySet } from "../src/types";

// ── 標本 ──────────────────────────────────────────────────
const MAX_SUMS = [5, 10, 20] as const;
type MaxSum = (typeof MAX_SUMS)[number];
const SET_SIZE = 5; // 1 セットの問題数（PlayScreen の SET_SIZE）
const SAMPLES = 2000; // maxSum ごとのセット数

function build(maxSum: MaxSum): StorySet[] {
  return withRandom(seeded(maxSum), () =>
    Array.from({ length: SAMPLES }, () => generateStorySet(maxSum, SET_SIZE)),
  );
}
const SETS: Record<MaxSum, StorySet[]> = {
  5: build(5),
  10: build(10),
  20: build(20),
};

// DESIGN §15: delta の上限は範囲に応じて 3 / 4 / 5。
const DELTA_CAP: Record<MaxSum, number> = { 5: 3, 10: 4, 20: 5 };
// 最初のグループの数。5まで・10まで は 2..maxSum-1、20まで は 7..14（DESIGN §15）。
const INITIAL_RANGE: Record<MaxSum, [number, number]> = {
  5: [2, 4],
  10: [2, 9],
  20: [7, 14],
};

// ── 読みやすい要約 ───────────────────────────────────────
function line(step: StorySet["steps"][number]): string {
  const sign = step.op === "add" ? "+" : "-";
  return `${step.op} ${step.before}${sign}${step.delta}=${step.answer} [${step.choices.join(",")}]`;
}
function digest(set: StorySet) {
  return {
    char: set.char.emoji,
    ask: set.char.ask,
    initialCount: set.initialCount,
    maxCount: set.maxCount,
    steps: set.steps.map(line),
  };
}

// 標本のすべてのセットが ok を満たすこと。外れたら件数と最初の 1 例を出す。
function expectAll(
  sets: StorySet[],
  rule: string,
  ok: (set: StorySet) => boolean,
): void {
  const bad = sets.filter((set) => !ok(set));
  if (bad.length > 0) {
    assert.fail(
      `${rule}: ${sets.length} セット中 ${bad.length} セットが違反。例: ${JSON.stringify(digest(bad[0]))}`,
    );
  }
}

// 素材（svg）の差し替え値（tests/register.mjs の { uri: "asset:<require の文字列>" }）からファイル名を取る。
function assetName(source: CharDef["svg"]): string {
  if (
    typeof source === "object" &&
    !Array.isArray(source) &&
    typeof source.uri === "string"
  ) {
    return source.uri.slice(source.uri.lastIndexOf("/") + 1);
  }
  throw new Error("素材の差し替え値ではありません");
}

// ── つづきもの出題の不変条件 ────────────────────────────────
for (const maxSum of MAX_SUMS) {
  describe(`generateStorySet: ${maxSum}まで x ${SAMPLES} セット`, () => {
    const sets = SETS[maxSum];
    const cap = DELTA_CAP[maxSum];
    const [initialMin, initialMax] = INITIAL_RANGE[maxSum];

    it("1 セットは 5 問", () => {
      expectAll(sets, "5 問", (set) => set.steps.length === SET_SIZE);
    });

    it("連鎖: 第 1 問の before は initialCount、以降の before は前の問題の answer", () => {
      expectAll(
        sets,
        "連鎖",
        (set) =>
          set.steps[0].before === set.initialCount &&
          set.steps.every(
            (step, i) => i === 0 || step.before === set.steps[i - 1].answer,
          ),
      );
    });

    it(`範囲: 開始数・before・answer はすべて 1..${maxSum} の整数`, () => {
      expectAll(sets, "範囲", (set) =>
        [
          set.initialCount,
          ...set.steps.flatMap((step) => [step.before, step.answer]),
        ].every((n) => Number.isInteger(n) && n >= 1 && n <= maxSum),
      );
    });

    it(`delta は 1 以上 ${cap} 以下の整数（1..${cap} がすべて出る）`, () => {
      expectAll(sets, "delta", (set) =>
        set.steps.every(
          (step) =>
            Number.isInteger(step.delta) &&
            step.delta >= 1 &&
            step.delta <= cap,
        ),
      );
      const seen = new Set(
        sets.flatMap((set) => set.steps.map((s) => s.delta)),
      );
      assert.deepEqual(
        [...seen].sort((a, b) => a - b),
        Array.from({ length: cap }, (_, i) => i + 1),
      );
    });

    it("op は向きと一致する（add は before+delta、sub は before-delta）", () => {
      expectAll(sets, "op と answer", (set) =>
        set.steps.every((step) =>
          step.op === "add"
            ? step.answer === step.before + step.delta
            : step.answer === step.before - step.delta,
        ),
      );
    });

    it("同じ演算は 3 連続しない（上限・下限で反対の演算が強いられても 3 連続にはならない）", () => {
      expectAll(
        sets,
        "3 連続",
        (set) =>
          !set.steps.some(
            (step, i) =>
              i >= 2 &&
              step.op === set.steps[i - 1].op &&
              step.op === set.steps[i - 2].op,
          ),
      );
    });

    it(`開始数 initialCount は ${initialMin}..${initialMax}（範囲の全部が出る）`, () => {
      expectAll(
        sets,
        "開始数",
        (set) =>
          set.initialCount >= initialMin && set.initialCount <= initialMax,
      );
      const seen = new Set(sets.map((set) => set.initialCount));
      assert.deepEqual(
        [...seen].sort((a, b) => a - b),
        Array.from(
          { length: initialMax - initialMin + 1 },
          (_, i) => initialMin + i,
        ),
      );
    });

    it("maxCount は initialCount と各 answer の最大", () => {
      expectAll(
        sets,
        "maxCount",
        (set) =>
          set.maxCount ===
          Math.max(set.initialCount, ...set.steps.map((step) => step.answer)),
      );
    });

    it("選択肢は answer を含む相異なる 3 つで、すべて 1..maxSum", () => {
      expectAll(sets, "選択肢", (set) =>
        set.steps.every(
          (step) =>
            step.choices.length === 3 &&
            new Set(step.choices).size === 3 &&
            step.choices.includes(step.answer) &&
            step.choices.every((c) => c >= 1 && c <= maxSum),
        ),
      );
    });

    it("たしざんとひきざんの両方が出る（上限・下限にも当たる）", () => {
      const steps = sets.flatMap((set) => set.steps);
      assert.ok(steps.some((step) => step.op === "add"));
      assert.ok(steps.some((step) => step.op === "sub"));
      // 検査が上限・下限の分岐（反対の演算を強いる）を通っていること。20まで の下限(1)は稀なので見ない。
      assert.ok(
        steps.some((step) => step.before === maxSum && step.op === "sub"),
        "上限に当たって sub が強いられた例が標本に無い",
      );
      if (maxSum !== 20) {
        assert.ok(
          steps.some((step) => step.before === 1 && step.op === "add"),
          "下限に当たって add が強いられた例が標本に無い",
        );
      }
    });
  });
}

describe("generateStorySet: 問題数 count", () => {
  it("count を渡すと、その問数のつづきものになる（5 以外でも連鎖は同じ）", () => {
    withRandom(seeded(1), () => {
      for (const count of [1, 3, 8]) {
        for (let i = 0; i < 200; i++) {
          const set = generateStorySet(10, count);
          assert.equal(set.steps.length, count);
          assert.equal(set.steps[0].before, set.initialCount);
          set.steps.forEach((step, k) => {
            if (k > 0) assert.equal(step.before, set.steps[k - 1].answer);
          });
        }
      }
    });
  });
});

describe("generateStorySet: 20まで は途中で 10 をまたぐ", () => {
  it("maxCount >= 11（作り直しは上限つきの安全網）", () => {
    expectAll(SETS[20], "maxCount >= 11", (set) => set.maxCount >= 11);
  });

  it("乱数がいつも 0 で 11 に届かなくても、作り直しは終わって有効なお話を返す", () => {
    let calls = 0;
    const set = withRandom(
      () => {
        calls += 1;
        if (calls > 100_000) throw new Error("作り直しが終わらない");
        return 0;
      },
      () => generateStorySet(20, SET_SIZE),
    );
    assert.ok(set.maxCount < 11, "この乱数では 11 に届かない前提");
    assert.equal(set.steps.length, SET_SIZE);
    assert.equal(set.steps[0].before, set.initialCount);
  });
});

// ── 選択肢 ───────────────────────────────────────────────
describe("makeChoices: answer を含む近い数 3 つ", () => {
  for (const maxSum of MAX_SUMS) {
    it(`${maxSum}まで: どの answer でも 3 つ・answer を含む・重複なし・1..${maxSum}`, () => {
      withRandom(seeded(maxSum), () => {
        for (let answer = 1; answer <= maxSum; answer++) {
          for (let i = 0; i < 20; i++) {
            const choices = makeChoices(answer, maxSum);
            assert.equal(choices.length, 3, `answer=${answer}`);
            assert.equal(new Set(choices).size, 3, `answer=${answer}`);
            assert.ok(choices.includes(answer), `answer=${answer}`);
            assert.ok(
              choices.every((c) => c >= 1 && c <= maxSum),
              `answer=${answer}: ${choices}`,
            );
          }
        }
      });
    });

    it(`${maxSum}まで: 近い数が選ばれる（端は内側へ 2 つ、それ以外は前後 1 つずつ）`, () => {
      withRandom(seeded(maxSum), () => {
        for (let answer = 1; answer <= maxSum; answer++) {
          const expected =
            answer === 1
              ? [1, 2, 3]
              : answer === maxSum
                ? [maxSum - 2, maxSum - 1, maxSum]
                : [answer - 1, answer, answer + 1];
          const choices = makeChoices(answer, maxSum).sort((a, b) => a - b);
          assert.deepEqual(choices, expected, `answer=${answer}`);
        }
      });
    });
  }

  it("並びはシャッフルされる（answer が決まった位置に固定されない）", () => {
    const positions = new Set<number>();
    const orders = new Set<string>();
    withRandom(seeded(1), () => {
      for (let i = 0; i < 300; i++) {
        const choices = makeChoices(3, 5);
        positions.add(choices.indexOf(3));
        orders.add(choices.join(","));
      }
    });
    assert.deepEqual([...positions].sort(), [0, 1, 2]);
    assert.equal(orders.size, 6, "3 つの並べ方 6 通りがすべて出る");
  });
});

// ── キャラ表（主役）──────────────────────────────────────
// CHARS は export されていないので、セットの char から集めて確かめる。
describe("主役の選び方とキャラ表", () => {
  // emoji → [助数詞 ask, 素材のファイル名]。ask は連濁を含む確定文字列で、画面にそのまま出る。
  const EXPECTED: Record<string, [string, string]> = {
    "🐥": ["なんわ", "hiyoko.svg"],
    "🐤": ["なんわ", "piyo.svg"],
    "🐦": ["なんわ", "tori.svg"],
    "🐰": ["なんわ", "usagi.svg"],
    "🐟": ["なんびき", "sakana.svg"],
    "🐠": ["なんびき", "nettaigyo.svg"],
    "🐢": ["なんびき", "kame.svg"],
    "🐶": ["なんびき", "inu.svg"],
    "🐱": ["なんびき", "neko.svg"],
    "🐸": ["なんびき", "kaeru.svg"],
    "🍎": ["なんこ", "ringo.svg"],
    "🍓": ["なんこ", "ichigo.svg"],
    "🍊": ["なんこ", "mikan.svg"],
    "🍋": ["なんこ", "remon.svg"],
    "⭐": ["なんこ", "hoshi.svg"],
    "🎈": ["なんこ", "fuusen.svg"],
    "🍩": ["なんこ", "doonatsu.svg"],
    "🌸": ["なんこ", "sakura.svg"],
  };

  // 標本に出た主役を emoji ごとに 1 つ集める。
  const chars = new Map<string, CharDef>();
  for (const maxSum of MAX_SUMS) {
    for (const set of SETS[maxSum]) chars.set(set.char.emoji, set.char);
  }

  it("18 種が出て、助数詞（ask）と素材の対応が今のまま", () => {
    const actual = Object.fromEntries(
      [...chars].map(([emoji, char]) => [
        emoji,
        [char.ask, assetName(char.svg)],
      ]),
    );
    assert.deepEqual(actual, EXPECTED);
  });

  it("素材（svg）は種ごとに別の値（『直前と別の種』を svg の違いで見分ける）", () => {
    const svgs = new Set([...chars.values()].map((char) => char.svg));
    assert.equal(svgs.size, 18);
  });

  it("prevChar を渡すと、直前と別の種になる（残りの 17 種はすべて出る）", () => {
    withRandom(seeded(7), () => {
      for (const prev of chars.values()) {
        const seen = new Set<string>();
        for (let i = 0; i < 400; i++) {
          const set = generateStorySet(10, SET_SIZE, prev);
          assert.notEqual(set.char.emoji, prev.emoji);
          seen.add(set.char.emoji);
        }
        assert.equal(seen.size, 17, `直前=${prev.emoji}`);
      }
    });
  });
});

// ── 同じ乱数列なら同じお話（現状の固定）──────────────────────────
// 期待値は、整理前（HEAD 6190cb5）の出題を種つきの乱数で回して書き写したもの。
// 外れたら、演算の選び方・delta の選び方・乱数を引く順序のどれかが変わっている。
describe("乱数を固定した出題（現状の固定）", () => {
  const GOLDEN: {
    name: string;
    maxSum: MaxSum;
    seed: number;
    expected: ReturnType<typeof digest>;
  }[] = [
    {
      name: "5まで seed=2",
      maxSum: 5,
      seed: 2,
      expected: {
        char: "🍋",
        ask: "なんこ",
        initialCount: 2,
        maxCount: 5,
        steps: [
          "add 2+3=5 [3,5,4]",
          "sub 5-2=3 [4,2,3]",
          "add 3+2=5 [3,5,4]",
          "sub 5-2=3 [2,3,4]",
          "sub 3-1=2 [1,3,2]",
        ],
      },
    },
    {
      name: "5まで seed=11（下限 1 に当たって add が強いられる）",
      maxSum: 5,
      seed: 11,
      expected: {
        char: "🐸",
        ask: "なんびき",
        initialCount: 3,
        maxCount: 3,
        steps: [
          "sub 3-2=1 [3,1,2]",
          "add 1+2=3 [4,3,2]",
          "sub 3-2=1 [2,1,3]",
          "add 1+1=2 [3,2,1]",
          "sub 2-1=1 [3,1,2]",
        ],
      },
    },
    {
      name: "10まで seed=5（上限 10 に当たって sub が強いられる）",
      maxSum: 10,
      seed: 5,
      expected: {
        char: "🍊",
        ask: "なんこ",
        initialCount: 8,
        maxCount: 10,
        steps: [
          "add 8+1=9 [9,10,8]",
          "add 9+1=10 [10,9,8]",
          "sub 10-1=9 [10,9,8]",
          "sub 9-2=7 [6,7,8]",
          "add 7+2=9 [8,10,9]",
        ],
      },
    },
    {
      name: "10まで seed=12（下限 1 に当たって add が強いられる）",
      maxSum: 10,
      seed: 12,
      expected: {
        char: "🐠",
        ask: "なんびき",
        initialCount: 2,
        maxCount: 4,
        steps: [
          "sub 2-1=1 [3,2,1]",
          "add 1+3=4 [3,4,5]",
          "sub 4-2=2 [2,1,3]",
          "sub 2-1=1 [2,3,1]",
          "add 1+2=3 [4,3,2]",
        ],
      },
    },
    {
      name: "20まで seed=1（11 に届かず 1 回作り直す）",
      maxSum: 20,
      seed: 1,
      expected: {
        char: "🍓",
        ask: "なんこ",
        initialCount: 13,
        maxCount: 18,
        steps: [
          "add 13+2=15 [15,16,14]",
          "add 15+3=18 [18,17,19]",
          "sub 18-2=16 [15,17,16]",
          "add 16+1=17 [17,16,18]",
          "add 17+1=18 [18,19,17]",
        ],
      },
    },
    {
      name: "20まで seed=6（11 に届かず 1 回作り直す）",
      maxSum: 20,
      seed: 6,
      expected: {
        char: "🐸",
        ask: "なんびき",
        initialCount: 12,
        maxCount: 12,
        steps: [
          "sub 12-5=7 [8,6,7]",
          "add 7+1=8 [7,8,9]",
          "sub 8-5=3 [3,4,2]",
          "sub 3-1=2 [2,1,3]",
          "add 2+1=3 [3,4,2]",
        ],
      },
    },
    {
      name: "20まで seed=9（上限 20 に当たる）",
      maxSum: 20,
      seed: 9,
      expected: {
        char: "🐰",
        ask: "なんわ",
        initialCount: 13,
        maxCount: 20,
        steps: [
          "add 13+4=17 [16,17,18]",
          "sub 17-2=15 [15,14,16]",
          "add 15+2=17 [17,16,18]",
          "add 17+3=20 [19,20,18]",
          "sub 20-1=19 [18,19,20]",
        ],
      },
    },
  ];

  for (const golden of GOLDEN) {
    it(golden.name, () => {
      const set = withRandom(seeded(golden.seed), () =>
        generateStorySet(golden.maxSum, SET_SIZE),
      );
      assert.deepEqual(digest(set), golden.expected);
    });
  }

  it("prevChar を渡した出題（主役の候補が 17 種になるので乱数の引き方も変わる）", () => {
    const prev = withRandom(seeded(3), () =>
      generateStorySet(10, SET_SIZE),
    ).char;
    assert.equal(prev.emoji, "🍊");
    const set = withRandom(seeded(7), () =>
      generateStorySet(10, SET_SIZE, prev),
    );
    assert.deepEqual(digest(set), {
      char: "🐥",
      ask: "なんわ",
      initialCount: 2,
      maxCount: 6,
      steps: [
        "sub 2-1=1 [3,1,2]",
        "add 1+2=3 [2,3,4]",
        "add 3+3=6 [5,7,6]",
        "sub 6-2=4 [5,3,4]",
        "add 4+1=5 [4,6,5]",
      ],
    });
  });

  it("1,500 セット（5まで・10まで・20まで x 500）の指紋が今と同じ", () => {
    // 読める例では届かない稀な分岐（上限・下限・作り直し）も含めて、全部のセットが同じであること。
    // 外れたら、上の読める例と不変条件のテストで原因を探す。意図した変更なら、それらが通ることを確かめてから更新する。
    const hash = createHash("sha256");
    for (const maxSum of MAX_SUMS) {
      withRandom(seeded(20261011 + maxSum), () => {
        for (let i = 0; i < 500; i++) {
          hash.update(
            JSON.stringify(digest(generateStorySet(maxSum, SET_SIZE))),
          );
        }
      });
    }
    assert.equal(hash.digest("hex").slice(0, 16), "59fd4aefc1a2d1d6");
  });
});
