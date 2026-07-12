// アプリ共通の型。DESIGN §7 準拠。座標・盤面は持たない（モノの並びは描画側が数から自動レイアウト）。

// たしざん（ふえる）/ ひきざん（へる）。
export type Op = 'add' | 'sub';

// 使うキャラ。ask は連濁を含んだ確定文字列（例: 'なんわ' 'なんびき' 'なんこ'）で、
// 連濁の間違いを避けるため計算せずそのまま表示する。
export interface CharDef {
  emoji: string;
  ask: string;
}

// 1問。
export interface Problem {
  op: Op;
  a: number; // 最初の数（≥1）
  b: number; // 増える/減る数（≥1）
  answer: number; // add: a+b / sub: a−b（常に 1..maxSum）
  char: CharDef;
  choices: number[]; // answer を含む3つ・シャッフル済み
}

// 画面ルート（文字ヘッダの無い最小ステートルーター）。
export type Route = { name: 'title' } | { name: 'play' } | { name: 'otona' };