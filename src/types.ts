// アプリ共通の型。DESIGN §7 準拠。座標・盤面は持たない（モノの並びは描画側が数から自動レイアウト）。

// たしざん（ふえる）/ ひきざん（へる）。
export type Op = 'add' | 'sub';

// 使うキャラ。ask は連濁を含んだ確定文字列（例: 'なんわ' 'なんびき' 'なんこ'）で、
// 連濁の間違いを避けるため計算せずそのまま表示する。
// svg はシールポップ画風の素材（assets/svg/*.svg を require したもの）。ステージで絵として表示する。
// emoji はフォールバック兼メタ情報として残す（音声・アクセシビリティ・素材差し替えの控え）。
export interface CharDef {
  emoji: string;
  ask: string;
  svg: import('react-native').ImageSourcePropType;
}

// つづきもの（連鎖出題）の1問＝1つの増減。DESIGN §15。
// 1セット5問は「ひとつづきのお話」で、同じ種・同じ助数詞のグループが画面に残ったまま、
// 各問でその場に増減が起きる。前問の答え（before）を開始数として次の増減がかかる。
export interface Step {
  op: Op; // add=ふえる / sub=へる（増減の向き。before と answer の大小と一致）
  before: number; // この問題の開始数（＝前問の答え。第1問は初期グループ initialCount）
  delta: number; // 増える/減る数（≥1）
  answer: number; // before+delta（add）/ before−delta（sub）。常に 1..maxSum
  choices: number[]; // answer を含む3つ・シャッフル済み
}

// 1セット＝ひとつづきのお話。char/助数詞はセット内で不変（同じ動物種で通す）。
export interface StorySet {
  char: CharDef; // このお話の主役（種・助数詞はセット内で固定）
  initialCount: number; // 最初に登場するグループの数（＝steps[0].before）
  steps: Step[]; // 連鎖する増減（既定5問）。steps[i].before === steps[i-1].answer
  maxCount: number; // このお話で画面に出る最大数（initialCount と各 answer の最大）。サイズ計算用
}

// 画面ルート（文字ヘッダの無い最小ステートルーター）。
export type Route = { name: 'title' } | { name: 'play' } | { name: 'otona' };