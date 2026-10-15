// タイトル画面。文字ゼロでも進める大ボタン「あそぶ」＋概念の絵（ふえる/へる）。
// 隅の歯車を3秒長押しでおとなモードへ（4歳が偶発しにくい親ゲート／DESIGN §6）。
// 左上の「まちへ もどる」（TownLink）で ぴよぴよランド（街）へ帰る。あそんでいる途中の画面には置かない。
//
// 並びは上から「まちへ もどる の行 → 題字〜あそぶ（残りの高さの中央）→ 歯車の行」。要素を重ねず流すので、
// 横向き（844x390・568x320 など）でも「まちへ もどる」が題字に重ならない。高さが足りないときは全体を
// スクロールして全部に届く。並びの順がそのまま Tab の順（まちへ もどる → 題字 → あそぶ → 歯車）になる。
// 背の低い横向き（src/layout.ts の isCompactLandscape）では、「あそぶ」がスクロールせずに見えるよう縦を詰める:
// 概念の絵2組を横1列に、余白を小さく、歯車は「まちへ もどる」の行の右端へ（Tab の順は変えない）。

import React from "react";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BigButton } from "@kerokero-1245/piyo-assets/ui/BigButton";
import {
  SHOW_TOWN,
  TOWN_LINK_HEIGHT,
  TownLink,
} from "@kerokero-1245/piyo-assets/ui/TownLink";
import { useLongPress } from "@kerokero-1245/piyo-assets/ui/useLongPress";
import { colors, font, space } from "../theme";
import { playSound } from "../audio/sounds";
import { sayPhrase, warmUpVoice } from "../audio/voice";
import { startSansuBgm } from "../audio/bgm";
import { getTtsOn } from "../settings";
import { FRAME_MAX_W, isCompactLandscape } from "../layout";

interface Props {
  onPlay: () => void;
  onOtona: () => void;
}

// 題字を1行に収める文字の大きさ。題字は枠の左右の余白（space.md）まで使い、画面の端から TITLE_EDGE だけ離す。
// 1字 = 1em（8字）＋字間 2×8 で見積もる（保守的）。Mac のヒラギノの UI 用書体はかなが約 0.92em と狭いが、
// かなが全角（1em）の書体（Android の Noto Sans CJK JP など）でも2行に折り返さないよう、狭い方には寄せない。
// 390 幅で 44（従来どおり）、360 幅で 41、320 幅で 36。
const TITLE_CHARS = 8; // 「ぴよぴよさんすう」
const TITLE_LETTER_SPACING = 2;
const TITLE_EDGE = 8;
function titleFontSize(windowW: number): number {
  const avail = Math.min(windowW, FRAME_MAX_W) - TITLE_EDGE * 2;
  return Math.min(
    font.huge,
    Math.floor((avail - TITLE_LETTER_SPACING * TITLE_CHARS) / TITLE_CHARS),
  );
}

// 概念の絵に使う素材（本編と同じシールポップ画風。assets/svg / problems.ts と同一）。
const ART_HIYOKO: ImageSourcePropType = require("../../assets/svg/hiyoko.svg");
const ART_RINGO: ImageSourcePropType = require("../../assets/svg/ringo.svg");

// 素材を count 個、絵文字と同じ横並びで描く（記号 ➕/➖ の左右に置く1グループ）。
// 素材SVGは viewBox 内に余白が焼き込まれているので、絵文字と同等の存在感になる一辺で中央に並べる。
function ConceptGroup({
  source,
  count,
}: {
  source: ImageSourcePropType;
  count: number;
}) {
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
  // 親ゲート: 歯車を 3 秒（useLongPress の既定）押し続けるとおとなモードへ。
  const otonaHold = useLongPress(onOtona);
  const { width: windowW, height: windowH } = useWindowDimensions();
  const compact = isCompactLandscape(windowW, windowH);

  // タイトルをタップすると「ぴよぴよさんすう」を読み上げる（ジェスチャ起点＝自動再生制限を守る）。
  // 最初のタップでもあるので warmUpVoice() で読み上げをアンロックしてから読む。読み上げオフなら黙る。
  const sayTitle = () => {
    playSound("tap");
    warmUpVoice();
    startSansuBgm(); // 最初のタップでBGMを開始（同一曲の再呼び出しは冪等）。読み上げオフでもBGMは鳴る
    sayPhrase("title", { enabled: getTtsOn() });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 街へ戻る（タイトルにだけ置く）。上に専用の行を取り、題字以下はその下に流す。 */}
        {SHOW_TOWN ? (
          <View style={styles.townRow}>
            <TownLink onPress={() => playSound("tap")} />
          </View>
        ) : null}

        <View style={styles.center}>
          {/* 題字は枠の左右の余白まで使う（全角かなの書体でも1行に収めるため）。 */}
          <View style={styles.titleRow}>
            <Pressable
              onPress={sayTitle}
              accessibilityRole="button"
              accessibilityLabel="ぴよぴよさんすう（きく）"
              hitSlop={12}
              testID="title-say"
            >
              <Text
                style={[styles.title, { fontSize: titleFontSize(windowW) }]}
              >
                ぴよぴよさんすう
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            かぞえて あそぼう
          </Text>

          {/* 概念の絵: ふえる（ひよこ2＋1）/ へる（りんご3−1）。本編と同じシールポップ素材で描く。 */}
          <View
            style={[styles.conceptBlock, compact && styles.conceptBlockRow]}
          >
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
          </View>

          <View style={[styles.playWrap, compact && styles.playWrapCompact]}>
            <BigButton
              emoji="▶️"
              label="あそぶ"
              size="huge"
              color={colors.play}
              pressedColor={colors.playPressed}
              onPress={() => {
                playSound("tap");
                warmUpVoice(); // 最初のタップで読み上げ（クリップ＋TTS）をアンロック
                startSansuBgm(); // 同じジェスチャ内でBGM開始（自動再生制限を守る／冪等）
                onPlay();
              }}
            />
          </View>
        </View>

        {/* 親ゲート: 3秒長押しでおとなモード（右下。ほかの要素と重ならないよう行として置く。
            背の低い横向きでは「まちへ もどる」の行の右端に置く） */}
        <View style={[styles.gearRow, compact && styles.gearRowCompact]}>
          <Pressable
            onPressIn={otonaHold.onPressIn}
            onPressOut={otonaHold.onPressOut}
            accessibilityRole="button"
            accessibilityLabel="おとなモード（長押し）"
            hitSlop={12}
            style={[styles.gear, compact && styles.gearCompact]}
          >
            <Text style={styles.gearGlyph}>⚙️</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // スクロールの入れ物は枠の左右の余白（space.md）まで広げ、中身の側で同じ余白を取り直す
  // （題字だけがその余白まで使えるようにするため。ほかの要素の位置は従来と同じ）。
  scroll: {
    flex: 1,
    marginHorizontal: -space.md,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.md,
  },
  townRow: {
    height: TOWN_LINK_HEIGHT,
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  center: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    alignSelf: "stretch",
    marginHorizontal: -space.md,
    alignItems: "center",
  },
  title: {
    fontSize: font.huge,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: TITLE_LETTER_SPACING,
  },
  subtitle: {
    fontSize: font.body,
    fontWeight: "700",
    color: colors.subtext,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  subtitleCompact: {
    marginBottom: space.sm,
  },
  conceptBlock: {
    alignItems: "center",
  },
  conceptBlockRow: {
    flexDirection: "row",
    columnGap: space.lg,
  },
  concept: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: space.xs,
  },
  conceptGroup: {
    flexDirection: "row",
    alignItems: "center",
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
    width: "100%",
    maxWidth: 320,
    marginTop: space.xl,
  },
  playWrapCompact: {
    marginTop: space.sm,
  },
  // 歯車の行（右下）。歯車の位置は従来（右 space.sm・下 space.sm）と同じ。
  gearRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: space.sm,
    paddingBottom: space.sm,
  },
  // 背の低い横向き: 「まちへ もどる」の行（高さ TOWN_LINK_HEIGHT＋余白）の右端。行の高さに収める。
  gearRowCompact: {
    position: "absolute",
    top: 0,
    right: space.md,
    paddingBottom: 0,
  },
  gear: {
    padding: space.sm,
    opacity: 0.35,
  },
  gearCompact: {
    padding: space.xs,
  },
  gearGlyph: {
    fontSize: 30,
  },
});
