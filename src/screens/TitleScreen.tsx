// タイトル画面。文字ゼロでも進める大ボタン「あそぶ」＋概念の絵（ふえる/へる）。
// 隅の歯車を3秒長押しでおとなモードへ（4歳が偶発しにくい親ゲート／DESIGN §6）。
// 左上の「まちへ もどる」で ぴよぴよランド（街）へ帰る。あそんでいる途中の画面には置かない。

import React, { useRef } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { colors, font, radius, space } from '../theme';
import BigButton from '../components/BigButton';
import { playSound } from '../audio/sounds';
import { sayPhrase, warmUpVoice } from '../audio/voice';
import { startSansuBgm } from '../audio/bgm';
import { getTtsOn } from '../settings';

interface Props {
  onPlay: () => void;
  onOtona: () => void;
}

const HOLD_MS = 3000;

// 街（ぴよぴよランド）は同じオリジンのルート https://kerokero-1245.github.io/ にある。
// さんすうは /piyopiyo-sansu/ で配っているので、同じオリジンの "/" へ移れば街に戻る。
// 街は web にしか無いので、ボタンも web のときだけ出す。
const TOWN_URL = '/';
const SHOW_TOWN = Platform.OS === 'web';
function goTown() {
  const loc = (globalThis as unknown as { location?: { assign(url: string): void } }).location;
  loc?.assign(TOWN_URL);
}

// 題字を1行に収める文字の大きさ。枠（最大幅 480・左右の余白 space.md）の内側の幅から決める。
// 実測（Chrome / ヒラギノ）で 44px のとき幅 341px ≒ 7.39×大きさ＋字間16。係数 7.55 で少し余裕を持たせ、
// 390 幅では従来どおり 44 のまま、360 幅で 40・320 幅で 34 になる。
function titleFontSize(windowW: number): number {
  const avail = Math.min(windowW, 480) - space.md * 2;
  return Math.min(font.huge, Math.floor((avail - 16) / 7.55));
}

// 概念の絵に使う素材（本編と同じシールポップ画風。assets/svg / problems.ts と同一）。
const ART_HIYOKO: ImageSourcePropType = require('../../assets/svg/hiyoko.svg');
const ART_RINGO: ImageSourcePropType = require('../../assets/svg/ringo.svg');

// 素材を count 個、絵文字と同じ横並びで描く（記号 ➕/➖ の左右に置く1グループ）。
// 素材SVGは viewBox 内に余白が焼き込まれているので、絵文字と同等の存在感になる一辺で中央に並べる。
function ConceptGroup({ source, count }: { source: ImageSourcePropType; count: number }) {
  return (
    <View style={styles.conceptGroup}>
      {Array.from({ length: count }, (_, i) => (
        <Image
          key={i}
          source={source}
          style={styles.conceptImg}
          resizeMode="contain"
          accessible={false}
          fadeDuration={0}
        />
      ))}
    </View>
  );
}

export default function TitleScreen({ onPlay, onOtona }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: windowW } = useWindowDimensions();

  const clearHold = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const startHold = () => {
    clearHold();
    timer.current = setTimeout(() => {
      timer.current = null;
      onOtona();
    }, HOLD_MS);
  };

  // タイトルをタップすると「ぴよぴよさんすう」を読み上げる（ジェスチャ起点＝自動再生制限を守る）。
  // 最初のタップでもあるので warmUpVoice() で読み上げをアンロックしてから読む。読み上げオフなら黙る。
  const sayTitle = () => {
    playSound('tap');
    warmUpVoice();
    startSansuBgm(); // 最初のタップでBGMを開始（同一曲の再呼び出しは冪等）。読み上げオフでもBGMは鳴る
    sayPhrase('title', { enabled: getTtsOn() });
  };

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Pressable
          onPress={sayTitle}
          accessibilityRole="button"
          accessibilityLabel="ぴよぴよさんすう（きく）"
          hitSlop={12}
          testID="title-say"
        >
          <Text style={[styles.title, { fontSize: titleFontSize(windowW) }]}>ぴよぴよさんすう</Text>
        </Pressable>
        <Text style={styles.subtitle}>かぞえて あそぼう</Text>

        {/* 概念の絵: ふえる（ひよこ2＋1）/ へる（りんご3−1）。本編と同じシールポップ素材で描く。 */}
        <View style={styles.concept}>
          <ConceptGroup source={ART_HIYOKO} count={2} />
          <Text style={styles.conceptSign}>➕</Text>
          <ConceptGroup source={ART_HIYOKO} count={1} />
        </View>
        <View style={styles.concept}>
          <ConceptGroup source={ART_RINGO} count={3} />
          <Text style={styles.conceptSign}>➖</Text>
          <ConceptGroup source={ART_RINGO} count={1} />
        </View>

        <View style={styles.playWrap}>
          <BigButton
            emoji="▶️"
            label="あそぶ"
            size="huge"
            color={colors.play}
            pressedColor={colors.playPressed}
            onPress={() => {
              playSound('tap');
              warmUpVoice(); // 最初のタップで読み上げ（クリップ＋TTS）をアンロック
              startSansuBgm(); // 同じジェスチャ内でBGM開始（自動再生制限を守る／冪等）
              onPlay();
            }}
          />
        </View>
      </View>

      {/* 街へ戻る（タイトルにだけ置く）。 */}
      {SHOW_TOWN ? (
        <Pressable
          onPress={() => {
            playSound('tap');
            goTown();
          }}
          accessibilityRole="link"
          accessibilityLabel="まちへ もどる"
          style={({ pressed }) => [styles.town, pressed && styles.townPressed]}
        >
          <Text style={styles.townText}>まちへ もどる</Text>
        </Pressable>
      ) : null}

      {/* 親ゲート: 3秒長押しでおとなモード */}
      <Pressable
        onPressIn={startHold}
        onPressOut={clearHold}
        accessibilityRole="button"
        accessibilityLabel="おとなモード（長押し）"
        hitSlop={12}
        style={styles.gear}
      >
        <Text style={styles.gearGlyph}>⚙️</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.subtext,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  concept: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.xs,
  },
  conceptGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conceptImg: {
    // 旧・絵文字（fontSize 34）と同等の存在感になる一辺。素材の焼き込み余白ぶん少しだけ大きめ。
    width: 42,
    height: 42,
  },
  conceptSign: {
    fontSize: 26,
    marginHorizontal: space.sm,
  },
  playWrap: {
    width: '100%',
    maxWidth: 320,
    marginTop: space.xl,
  },
  town: {
    position: 'absolute',
    left: 0,
    top: 0,
    minHeight: 44,
    paddingHorizontal: space.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.stageBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  townPressed: {
    backgroundColor: colors.choicePressed,
  },
  townText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  gear: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    padding: space.sm,
    opacity: 0.35,
  },
  gearGlyph: {
    fontSize: 30,
  },
});