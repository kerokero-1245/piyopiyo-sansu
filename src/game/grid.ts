// モノの並び方（1行あたりの数 cols と行数 rows）を、数 n から一意に決める共有ロジック。
// PlayScreen の computeThingSize（モノ1辺の算出）と ThingsStage の positionsFor（中央そろえの座標）
// が同じ並びを使うよう、ここに一本化する（DESIGN §8・§15）。
//
// 行数の決め方（見た目を崩さないよう段階的に増やす）:
//   n ≤ 5   → 1行（cols=n）           … 5まで の見た目は従来どおり
//   6..10   → 2行（cols=ceil(n/2)）   … 10まで の見た目は従来どおり
//   11..15  → 3行（cols=ceil(n/3)）   … 20まで で追加
//   16..20  → 4行（cols=ceil(n/4)）   … 20まで で追加
// cols は常に ceil(n/rows)。行ごとの実個数・中央そろえは呼び出し側（positionsFor）が汎用に扱う。

export interface GridPlan {
  cols: number;
  rows: number;
}

function rowsFor(n: number): number {
  if (n <= 5) return 1;
  if (n <= 10) return 2;
  if (n <= 15) return 3;
  return 4;
}

// n 個を並べるときの列数・行数。n≤0 でも安全に 1×1 を返す。
export function gridPlan(n: number): GridPlan {
  if (n <= 0) return { cols: 1, rows: 1 };
  const rows = rowsFor(n);
  const cols = Math.ceil(n / rows);
  return { cols, rows };
}

// モノ1辺を決めるための「サイズ決めグリッド」。
// 列数は n が増えると単調に増えない（例: 13個=3行×5列 の方が 16個=4行×4列 より列が多い）。
// セット中に現れるどの数 n（1..maxCount）でも横にはみ出さないよう、幅の見積もりには
// 「現れうる最大列数」を使う。高さは行数が単調増加なので rows(maxCount) で足りる。
// ただし maxCount≤10（5まで/10まで）は従来の gridPlan(maxCount) と同一のサイズを保つ
// （既存の見た目を1pxも変えない）。maxCount≥11（20まで）のみ最大列数へ広げる。
export function sizingPlan(maxCount: number): GridPlan {
  const base = gridPlan(maxCount);
  if (maxCount <= 10) return base;
  let cols = base.cols;
  for (let n = 1; n <= maxCount; n++) cols = Math.max(cols, gridPlan(n).cols);
  return { cols, rows: base.rows };
}
