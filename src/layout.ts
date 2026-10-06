// 画面の大きさ・向きに応じたレイアウトの判定（DESIGN §8）。App.tsx・PlayScreen・ClearOverlay で共有する。

import { space } from './theme';

// 縦持ち前提の枠（App.tsx の frame）の最大幅。
export const FRAME_MAX_W = 480;
// 背の低い横向きで、もんだい画面だけに使う広い枠の最大幅（ステージと選択肢を左右に並べるため）。
export const FRAME_MAX_W_WIDE = 960;
// 枠の上下の余白（ふつう / 背の低い横向き）。がんばりカードはこの余白まで使って中身を置く（ClearOverlay）。
export const FRAME_PAD_TOP = space.lg;
export const FRAME_PAD_BOTTOM = space.md;
export const FRAME_PAD_COMPACT = space.sm;

// 「背の低い横向き」（スマホの横持ち。例: 844x390・896x414・568x320）。
// 縦持ち前提の1列の並び（ヘッダー＋ステージ＋問い＋選択肢）ではステージの高さが 0 近くまで潰れるので、
// もんだい画面はステージと選択肢を左右に分け、枠の上下の余白も詰める。
// 1280x800 のように横長でも高さが足りる画面は対象外（従来どおり1列）。
const COMPACT_LANDSCAPE_MAX_H = 600;

export function isCompactLandscape(windowW: number, windowH: number): boolean {
  return windowW > windowH && windowH < COMPACT_LANDSCAPE_MAX_H;
}
