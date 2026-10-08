// 1セット（5問）ぜんぶ終わったときの「きょうの がんばりカード」（DESIGN §14）。
// できたね!画面を進化させ、集めた⭐を1つずつ順に出す（数え上げのトーン）→ 5つ揃って祝福。
// その下に「あつめた ほし ⭐×N」（累計）を控えめに表示。スコアも罰も出さない（DESIGN §4）。
//
// ⭐の累計は PlayScreen が1問クリアごとに settings へ加算済み。ここでは読むだけ（表示は getShownStars）。
//
// 中身（カード＋ボタン）はスクロールできる入れ物に入れる。背の低い横向き（568x320 など）では
// 縦に積むと「おうちへ」が画面の下に切れていたので、スクロールで必ず届くようにする。
// 背の低い横向きで幅が足りるとき（844x390・896x414 など）は、カードとボタンを左右に並べてスクロールなしで収める。
// 入れ物は枠（App.tsx の frame）の上下の余白まで広げ、中身の中心は従来と同じ位置（枠の内側の中央）に置く。
// 従来は中身が高いとき（320x568）に上下の余白へはみ出して中央に置かれていたので、その見た目のまま収まる。

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, space } from '../theme';
import BigButton from './BigButton';
import Confetti from './Confetti';
import { getShownStars, getTtsOn } from '../settings';
import { playCountTone, playSound } from '../audio/sounds';
import { sayPhrase } from '../audio/voice';
import {
  FRAME_MAX_W,
  FRAME_MAX_W_WIDE,
  FRAME_PAD_BOTTOM,
  FRAME_PAD_COMPACT,
  FRAME_PAD_TOP,
  isCompactLandscape,
} from '../layout';

// ⭐ はシールポップ画風の素材（ほし）に差し替え。まだ集めていないスロットは薄く表示する。
const HOSHI = require('../../assets/svg/hoshi.svg');

// 暗幕は画面全体に敷く。このオーバーレイは最大幅 480 の枠（App.tsx の frame）の内側に置かれるので、
// absolute のままだと広い画面では枠の中だけが暗くなる。web では position: fixed でビューポート全体を覆う
// （react-native-web は fixed をそのまま CSS に渡す。RN の型には無いので型だけ合わせる）。
const BACKDROP_FULL: ViewStyle | null =
  Platform.OS === 'web' ? ({ position: 'fixed' } as unknown as ViewStyle) : null;

// 左右に並べるのに要る幅（カードの最大幅 380 ＋ 間 ＋ ボタンの列 ＋ 左右の余白）。
const CARD_MAX_W = 380;
const SIDE_BUTTONS_W = 280;
const SIDE_GAP = space.lg;
const SIDE_MIN_W = CARD_MAX_W + SIDE_GAP + SIDE_BUTTONS_W + space.md * 2;
// スクロールの入れ物の上下の端と中身の間（最小）。
const SCROLL_EDGE = 2;
// カードの枠線の太さ（styles.card の borderWidth）。
const CARD_BORDER = 4;

// カードの中身を置ける幅（枠線と左右の余白 space.md の内側）。boxW はスクロールの入れ物の実測幅
// （測る前は枠の幅から見積もる）。左右に並べるときのカードは CARD_MAX_W 固定。
function cardInnerW(boxW: number, sideBySide: boolean): number {
  const cardW = sideBySide ? CARD_MAX_W : Math.min(boxW - space.md * 2, CARD_MAX_W);
  return cardW - CARD_BORDER * 2 - space.md * 2;
}

// カードの⭐を1行に収める大きさ（ぴよぴよことばと同じ作り）。390 幅では従来どおりスロット 44（絵 42）、
// 360 幅で 41、320 幅で 33 になる（従来は 360 幅で 4+1、320 幅で 3+2 に折り返していた）。
const STAR_SLOT = 44;
const STAR_IMG = 42;
const STAR_GAP = space.xs;
function starSlotSize(innerW: number, count: number): number {
  return Math.min(STAR_SLOT, Math.floor((innerW - STAR_GAP * (count - 1)) / count));
}

// カードの見出し「きょうの がんばりカード」と「ぜんぶ できたね!」を語の途中で折らない文字の大きさ
// （ぴよぴよことばと同じ作り）。見出しはカードの左右の余白のうち TEXT_BLEED だけ食い込んで使い
// （中央そろえなので位置は変わらない）、1字 = 1em（空白は 0.5 字）で見積もった幅に収まる大きさにする
// （題字と同じ考え方・保守的）。360 幅以上は従来どおり 22 / 28、320 幅で 18 / 25（従来は語の途中で
// 2行に折り返していた）。
const TITLE_FONT = 22;
const DONE_FONT = 28;
const TEXT_BLEED = space.sm;
function fitFont(text: string, base: number, availW: number): number {
  let cols = 0;
  for (const ch of text) cols += ch === ' ' ? 0.5 : 1;
  return Math.min(base, Math.floor(availW / cols));
}
const TITLE_TEXT = 'きょうの がんばりカード';
const DONE_TEXT = 'ぜんぶ できたね!';

interface Props {
  starCount: number; // このセットで集めた⭐の数（=5）
  onReplay: () => void;
  onHome: () => void;
}

// カード上の⭐スロット1つ。まだ出ていないときは薄い☆、出た瞬間に⭐が「ぽんっ」と現れる。
function CardStar({ filled, size }: { filled: boolean; size: number }) {
  const pop = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const prev = useRef(filled);
  useEffect(() => {
    if (filled && !prev.current) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 130, useNativeDriver: false }).start();
    }
    prev.current = filled;
  }, [filled, pop]);

  // 枠の幅が足りないときだけ小さくする（44 のときは従来と同じ 44x50・絵 42）。
  const slot = { width: size, height: size + 6 };
  const img = { width: size - (STAR_SLOT - STAR_IMG), height: size - (STAR_SLOT - STAR_IMG) };
  if (!filled) {
    return (
      <View style={[styles.starSlot, slot]}>
        <Image source={HOSHI} resizeMode="contain" style={[styles.starEmpty, img]} />
      </View>
    );
  }
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const opacity = pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return (
    <View style={[styles.starSlot, slot]}>
      <Animated.Image
        source={HOSHI}
        resizeMode="contain"
        style={[styles.starFull, img, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

export default function ClearOverlay({ starCount, onReplay, onHome }: Props) {
  // 累計は既に加算済み。マウント時に一度だけ読む（おとなモードで 0 に もどした後は、そこからの数）。
  const total = useRef(getShownStars()).current;

  // 背の低い横向きで幅が足りるときだけ左右に並べる（中身の入れ物の実測幅で決める）。
  const { width: windowW, height: windowH } = useWindowDimensions();
  const [boxW, setBoxW] = useState(0);
  const compact = isCompactLandscape(windowW, windowH);
  const sideBySide = compact && boxW >= SIDE_MIN_W;
  // 入れ物を枠の上下の余白まで広げ、中身の中心が従来（枠の内側の中央）と同じになるよう上下の余白を決める。
  const padTop = compact ? FRAME_PAD_COMPACT : FRAME_PAD_TOP;
  const padBottom = compact ? FRAME_PAD_COMPACT : FRAME_PAD_BOTTOM;
  const scrollBox = { top: -padTop, bottom: -padBottom };
  const contentPad = { paddingTop: padTop - padBottom + SCROLL_EDGE, paddingBottom: SCROLL_EDGE };
  // 見出しの文字と⭐の大きさはカードの内側の幅から決める（測る前は枠の幅から見積もる）。
  const boxEstW = boxW > 0 ? boxW : Math.min(windowW, compact ? FRAME_MAX_W_WIDE : FRAME_MAX_W) - space.md * 2;
  const innerW = cardInnerW(boxEstW, sideBySide);
  const starSize = starSlotSize(innerW, starCount);
  const titleFont = { fontSize: fitFont(TITLE_TEXT, TITLE_FONT, innerW + TEXT_BLEED * 2) };
  const doneFont = { fontSize: fitFont(DONE_TEXT, DONE_FONT, innerW + TEXT_BLEED * 2) };

  const [shown, setShown] = useState(0); // いくつ⭐が現れたか（0..starCount）
  const [gathered, setGathered] = useState(false); // 5つ揃った（祝福）

  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      timers.current.push(id);
    };

    // カードがふわっと出る。
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    // ⭐を1つずつ順に出す（数え上げと同じトーンで音程を上げていく）→ 揃ったら祝福。
    const startDelay = 480;
    const stepMs = 460;
    for (let i = 0; i < starCount; i++) {
      later(() => {
        setShown(i + 1);
        playCountTone(i);
      }, startDelay + i * stepMs);
    }
    later(() => {
      setGathered(true);
      playSound('clear'); // 5つ揃ってファンファーレ＋紙吹雪
      sayPhrase('dekita', { enabled: getTtsOn() }); // 「ぜんぶ できたね！」（読み上げオフなら黙る）
    }, startDelay + starCount * stepMs + 140);

    return () => timers.current.forEach(clearTimeout);
    // マウント時のみ（done で1回だけ表示される）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={[styles.backdrop, BACKDROP_FULL]} pointerEvents="none" />
      {gathered ? <Confetti /> : null}

      <ScrollView
        style={[styles.scroll, scrollBox]}
        contentContainerStyle={[styles.content, contentPad, sideBySide && styles.contentSide]}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[styles.card, sideBySide && styles.cardSide, { opacity, transform: [{ scale }] }]}
        >
          <Text style={[styles.title, titleFont]}>{TITLE_TEXT}</Text>

          <View style={styles.stars}>
            {Array.from({ length: starCount }, (_, i) => (
              <CardStar key={i} filled={i < shown} size={starSize} />
            ))}
          </View>

          {/* 5つ揃ったら「できたね!」。揃うまでは高さを確保して見た目が跳ねないようにする。 */}
          <View style={styles.doneSlot}>
            {gathered ? <Text style={[styles.doneText, doneFont]}>{DONE_TEXT}</Text> : null}
          </View>

          {/* 累計コレクション（控えめ・数字スコアではなく“集めた⭐の数”） */}
          <View style={styles.totalRow}>
            <Text style={styles.total}>あつめた ほし </Text>
            <Image source={HOSHI} resizeMode="contain" style={styles.totalStar} />
            <Text style={styles.total}> × {total}</Text>
          </View>
        </Animated.View>

        <View style={[styles.buttons, sideBySide && styles.buttonsSide]}>
          <BigButton
            emoji="🔁"
            label="もういちど"
            onPress={onReplay}
            color={colors.play}
            pressedColor={colors.playPressed}
          />
          <BigButton emoji="🏠" label="おうちへ" onPress={onHome} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 上下は枠の余白まで広げる（top / bottom は描画時に与える）。
  scroll: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  // 中央寄せ（左右の余白 space.md は従来の root と同じ）。高さが足りないときはスクロールで届く。
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  contentSide: {
    flexDirection: 'row',
    columnGap: SIDE_GAP,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.lg,
    maxWidth: CARD_MAX_W,
    width: '100%',
    borderWidth: CARD_BORDER,
    borderColor: colors.white,
    shadowColor: '#00000066',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: TITLE_FONT,
    fontWeight: '900',
    color: colors.text,
    marginBottom: space.sm,
    textAlign: 'center',
    // カードの左右の余白に TEXT_BLEED だけ食い込む。中央そろえなので位置は変わらない。
    alignSelf: 'stretch',
    marginHorizontal: -TEXT_BLEED,
  },
  stars: {
    // 5つは必ず1行に並べる（大きさは starSlotSize でカードの内側の幅に合わせる）。
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    columnGap: STAR_GAP,
  },
  starSlot: {
    width: 44,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starFull: {
    width: 42,
    height: 42,
  },
  starEmpty: {
    width: 42,
    height: 42,
    opacity: 0.28,
  },
  doneSlot: {
    alignSelf: 'stretch',
    marginHorizontal: -TEXT_BLEED,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xs,
  },
  doneText: {
    fontSize: DONE_FONT,
    fontWeight: '900',
    color: colors.button,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.sm,
  },
  total: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.subtext,
  },
  totalStar: {
    width: 18,
    height: 18,
  },
  cardSide: {
    width: CARD_MAX_W,
    marginBottom: 0,
  },
  buttons: {
    width: '100%',
    maxWidth: 360,
    rowGap: space.sm,
  },
  buttonsSide: {
    width: SIDE_BUTTONS_W,
  },
});