// src の流儀どおり、型だけの import に `type` を付けない（problems.ts の `import { CharDef, … } from "../types"` と同じ形）。
// 変換で消えなければ、実行時に「./types に Shape という export が無い」と落ちる。
import { Shape } from "./types";

export function sides(shape: Shape): number {
  return shape.sides;
}
