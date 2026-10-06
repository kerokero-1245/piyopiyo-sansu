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

// モノ1辺を決めるための「サイズ決めグリッド」。counts は このお話で画面に並ぶ数の一覧
// （initialCount と各問の answer。増減の途中も並びは before / answer のどちらかなので、これで全部）。
// 列数は n が増えると単調に増えない（例: 5個=1行×5列 の方が 6個=2行×3列 より列が多い／
// 13個=3行×5列 の方が 16個=4行×4列 より列が多い）。お話に出るどの数でも横にはみ出さないよう、
// 幅の見積もりには「お話に出る数の列数の最大」を使う。高さは行数が単調増加なので最大数の行数で足りる。
// 以前は 1..maxCount のすべての数で見積もっていたため、お話に出ない数（例: 8 までのお話で一度も出ない 5）の
// 列数まで取って、必要のない場面でも絵が縮んでいた。
export function sizingPlan(counts: readonly number[]): GridPlan {
  let maxN = 0;
  let cols = 1;
  for (const n of counts) {
    if (n > maxN) maxN = n;
    cols = Math.max(cols, gridPlan(n).cols);
  }
  return { cols, rows: gridPlan(maxN).rows };
}
