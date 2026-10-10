// src/game/grid.ts の現状固定。モノの並び（gridPlan）と、大きさ決めの並び（sizingPlan）。
// 期待値は DESIGN §8 と grid.ts 冒頭の表（5→1 行 / 6..10→2 行 / 11..15→3 行 / 16..20→4 行）から手で書き下したもの。
// 実装の式（ceil(n / rows)）を写さず、数ごとの答えを並べて固定している。

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gridPlan, sizingPlan } from "../src/game/grid";

describe("gridPlan: n 個を並べるときの列数と行数", () => {
  // [n, 列数 cols, 行数 rows]
  const TABLE: [number, number, number][] = [
    [1, 1, 1],
    [2, 2, 1],
    [3, 3, 1],
    [4, 4, 1],
    [5, 5, 1], // 5まで は 1 行
    [6, 3, 2],
    [7, 4, 2],
    [8, 4, 2],
    [9, 5, 2],
    [10, 5, 2], // 10まで は 2 行まで
    [11, 4, 3],
    [12, 4, 3],
    [13, 5, 3],
    [14, 5, 3],
    [15, 5, 3], // 20まで で 3 行目を足す
    [16, 4, 4],
    [17, 5, 4],
    [18, 5, 4],
    [19, 5, 4],
    [20, 5, 4], // 20まで で 4 行目を足す
  ];

  for (const [n, cols, rows] of TABLE) {
    it(`${n} 個は ${rows} 行 x ${cols} 列`, () => {
      assert.deepEqual(gridPlan(n), { cols, rows });
    });
  }

  it("1..20 のどの数でも、並べた枠に全部入る（cols x rows >= n）", () => {
    for (let n = 1; n <= 20; n++) {
      const { cols, rows } = gridPlan(n);
      assert.ok(cols * rows >= n, `${n} 個が ${cols}x${rows} に入らない`);
    }
  });

  it("行数は数が増えても減らない", () => {
    let previous = 0;
    for (let n = 1; n <= 20; n++) {
      const { rows } = gridPlan(n);
      assert.ok(rows >= previous, `${n} 個で行数が減った`);
      previous = rows;
    }
  });

  it("0 以下でも安全に 1 x 1 を返す", () => {
    assert.deepEqual(gridPlan(0), { cols: 1, rows: 1 });
    assert.deepEqual(gridPlan(-3), { cols: 1, rows: 1 });
  });
});

describe("sizingPlan: モノの 1 辺を決める並び（お話に出る数の一覧から）", () => {
  it("列数は『お話に出る数の列数の最大』（5 個の 5 列は 6 個の 3 列より広い）", () => {
    assert.deepEqual(sizingPlan([5, 6]), { cols: 5, rows: 2 });
  });

  it("行数は一番大きい数の行数（列の最大の数とは別）", () => {
    // 13 個は 3 行 x 5 列、16 個は 4 行 x 4 列。幅は 13 個、高さは 16 個で決まる。
    assert.deepEqual(sizingPlan([13, 16]), { cols: 5, rows: 4 });
  });

  it("お話に出ない数の列数は取らない（8 だけなら 5 列にならず 4 列）", () => {
    assert.deepEqual(sizingPlan([8]), { cols: 4, rows: 2 });
    assert.deepEqual(sizingPlan([6]), { cols: 3, rows: 2 });
  });

  it("5まで のお話（2..5 個）は 1 行", () => {
    assert.deepEqual(sizingPlan([3, 5, 4, 2, 4, 3]), { cols: 5, rows: 1 });
    assert.deepEqual(sizingPlan([2, 3, 2]), { cols: 3, rows: 1 });
  });

  it("20まで のお話の例（7, 9, 11, 8, 6, 10）は 5 列 x 3 行", () => {
    assert.deepEqual(sizingPlan([7, 9, 11, 8, 6, 10]), { cols: 5, rows: 3 });
  });

  it("一番多い 20 個なら 5 列 x 4 行", () => {
    assert.deepEqual(sizingPlan([12, 20, 15]), { cols: 5, rows: 4 });
  });

  it("並べる順番や重複で結果が変わらない", () => {
    assert.deepEqual(sizingPlan([6, 5]), sizingPlan([5, 6]));
    assert.deepEqual(sizingPlan([8, 8, 8]), sizingPlan([8]));
  });

  it("空の一覧でも 1 x 1", () => {
    assert.deepEqual(sizingPlan([]), { cols: 1, rows: 1 });
  });
});
