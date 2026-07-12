// さんすうアプリ 全体の見た目の基準値。
// 4歳児が使う画面なので「大きく・やさしい色・少ない要素・高いコントラスト」を原則にする。
// おつかいめいろ/src/theme.ts と同じ構成（colors / font / space / radius）。

export const colors = {
  // 地の色
  bg: '#FFF6E5', // やわらかいクリーム（背景）
  surface: '#FFFFFF', // カード

  // ステージ（モノを置く場）
  stageBg: '#FFFDF6',
  stageBorder: '#F0D9A8',

  // 数え上げのハイライト
  countHalo: '#FFE9A6', // 数えたモノの下にともる やわらかい光
  countRing: '#FF9F45', // その縁どり
  countBadge: '#FF6B6B', // 「1・2・3」の大きな数字バッジ

  // 選択肢ボタン
  choice: '#FFFFFF',
  choicePressed: '#F3ECDD',
  choiceBorder: '#F0D9A8',
  dot: '#FF8FA3', // 選択肢のドット（●）
  dotBorder: '#F26D86',

  // 前向きなボタン
  button: '#FF9F45', // オレンジ
  buttonPressed: '#F08A2E',
  play: '#5FBF7A', // 「あそぶ」など
  playPressed: '#4EA867',

  // 進捗ドット（何問目か）
  progressOn: '#5FBF7A',
  progressNow: '#FF9F45',
  progressOff: '#E8D9BE',

  // 文字（読める子むけの装飾程度）
  text: '#5B3A1E', // こげ茶
  subtext: '#9B7B57',
  white: '#FFFFFF',

  // 祝福の紙吹雪
  confetti: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF9F45', '#C77DFF'],

  primary: '#FF9F45',
  overlay: 'rgba(43, 26, 12, 0.45)', // 祝福オーバーレイの背後を少し暗く
};

// 大きめのフォント。ひらがなは「読める子には嬉しい」装飾程度に留める。
export const font = {
  jumbo: 72, // 主役の大きな数字など
  huge: 44,
  title: 34,
  big: 26,
  body: 20,
  small: 16,
};

export const space = { xs: 6, sm: 12, md: 20, lg: 28, xl: 40 };

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 };