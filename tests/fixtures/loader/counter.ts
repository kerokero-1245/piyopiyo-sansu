// モジュールが読み直されたかを見分けるための、中に状態を持つファイル。
let count = 0;

export function next(): number {
  count += 1;
  return count;
}
