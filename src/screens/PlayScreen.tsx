// もんだい画面（本体）。たしざん・ひきざんを混ぜて5問出題する。
// 流れ: 増減アニメ → 「ぜんぶで/のこりは いくつ?」＋3択 → 正解=数え上げ→紙吹雪→次へ /
//        不正解=ぷるぷる→ゆっくり数え上げ→もう一度。5問おわると できたね!。
//
// レイアウト（おつかいめいろの教訓 / DESIGN §8）:
//   縦を「ヘッダー＋ステージ＋問い＋選択肢帯」で構成し、ステージを flex:1 で確保。
//   ステージの実測サイズ（onLayout）からモノの大きさを算出して、可視領域を絶対にはみ出さない。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { generateSet } from '../game/problems';
import { addStars, getMaxSum } from '../settings';
import { playSound } from '../audio/sounds';
import { Problem } from '../types';
import ThingsStage, { ThingsStageHandle } from '../components/ThingsStage';
import ChoiceButton from '../components/ChoiceButton';
import ClearOverlay from '../components/ClearOverlay';
import Confetti from '../components/Confetti';
import ProgressStar from '../components/ProgressStar';

interface Props {
  onHome: () => void;
}

const SET_SIZE = 5;
const GAP = 12;
const BADGE_RESERVE = 72; // ステージ内の数え上げバッジ帯のぶん

// モノの並び方（1行あたりの数と行数）。5以下は1行、6以上は2行に均等割り。
function gridPlan(renderCount: number): { cols: number; rows: number } {
  if (renderCount <= 5) return { cols: Math.max(1, renderCount), rows: 1 };
  const cols = Math.ceil(renderCount / 2);
  return { cols, rows: 2 };
}

// 実測した残り領域に収まるモノの1辺を求める。
function computeThingSize(w: number, h: number, renderCount: number): number {
  const { cols, rows } = gridPlan(renderCount);
  const usableW = Math.max(w - space.md * 2, 80);
  const usableH = Math.max(h - BADGE_RESERVE - space.md, 80);
  const byW = (usableW - (cols - 1) * GAP) / cols;
  const byH = (usableH - (rows - 1) * GAP) / rows;
  return Math.max(40, Math.min(byW, byH, 132));
}

export default function PlayScreen({ onHome }: Props) {
  const maxSumRef = useRef<number>(getMaxSum());
  const [problems, setProblems] = useState<Problem[]>(() =>
    generateSet(maxSumRef.current, SET_SIZE)
  );
  const [index, setIndex] = useState(0);
  const [gameId, setGameId] = useState(0);
  // このセットで集めた⭐スタンプの数（=クリアした問題数）。進捗ドットが左から⭐に変わる。
  const [starsEarned, setStarsEarned] = useState(0);

  const [measured, setMeasured] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false); // 増減アニメ後に回答可能
  const [locked, setLocked] = useState(false); // 数え上げ/祝福のあいだは押せない
  const [wrongValue, setWrongValue] = useState(-1); // 直近にまちがえた値（震わせる対象）
  const [wrongNonce, setWrongNonce] = useState(0); // 単調増加（震えの再トリガ）
  const [celebrating, setCelebrating] = useState(false);
  const [done, setDone] = useState(false);

  const stageRef = useRef<ThingsStageHandle>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  const problem = problems[index];
  const renderCount = problem.op === 'add' ? problem.answer : problem.a;
  const plan = gridPlan(renderCount);
  const size = computeThingSize(measured.w, measured.h, renderCount);

  const onStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMeasured((m) => (m.w === width && m.h === height ? m : { w: width, h: height }));
  };

  const handleReady = useCallback(() => {
    setReady(true);
    setLocked(false);
  }, []);

  const goNext = useCallback(() => {
    setWrongValue(-1);
    if (index + 1 >= problems.length) {
      setDone(true);
    } else {
      setReady(false);
      setLocked(false);
      setIndex(index + 1);
    }
  }, [index, problems.length]);

  const newGame = useCallback(() => {
    setProblems(generateSet(maxSumRef.current, SET_SIZE));
    setIndex(0);
    setGameId((g) => g + 1);
    setStarsEarned(0);
    setReady(false);
    setLocked(false);
    setCelebrating(false);
    setDone(false);
    setWrongValue(-1);
  }, []);

  const onChoice = useCallback(
    (value: number) => {
      if (!ready || locked || done) return;
      playSound('tap');
      if (value === problem.answer) {
        // 正解: 数え上げ → ⭐スタンプ獲得（進捗ドットが⭐に変わる）→ ちいさな紙吹雪 → 次へ。
        // 再挑戦してからのクリアでも同じ⭐（獲得に条件差はつけない・DESIGN §14）。
        setReady(false);
        setLocked(true);
        stageRef.current?.countUp(() => {
          // ⭐を1つ獲得。累計にも加算し、進捗ドットを⭐へ（ぽんっと出る）。
          addStars(1);
          setStarsEarned((s) => s + 1);
          playSound('star');
          setCelebrating(true);
          later(() => {
            setCelebrating(false);
            goNext();
          }, 1100);
        }, false);
      } else {
        // 不正解: ぷるぷる → ゆっくり数え上げ（正しい数え方を見せる）→ もう一度。罰なし。
        setWrongValue(value);
        setWrongNonce((n) => n + 1);
        playSound('wrong');
        setReady(false);
        setLocked(true);
        stageRef.current?.countUp(() => {
          stageRef.current?.reset();
          setLocked(false);
          setReady(true);
        }, true);
      }
    },
    [ready, locked, done, problem, goNext, later]
  );

  const choicesDisabled = !ready || locked || done;

  return (
    <View style={styles.root}>
      {/* ヘッダー: おうち＋進捗ドット */}
      <View style={styles.header}>
        <Pressable onPress={onHome} hitSlop={10} style={styles.homeBtn} accessibilityLabel="おうちへ">
          <Text style={styles.homeGlyph}>🏠</Text>
        </Pressable>
        <View style={styles.progress} testID="progress">
          {problems.map((_, i) => (
            // クリア済み=⭐ / いまの問題=オレンジ丸 / これから=グレー丸
            <ProgressStar key={i} state={i < starsEarned ? 'star' : i === index ? 'now' : 'off'} />
          ))}
        </View>
        <View style={styles.homeBtn} />
      </View>

      {/* ステージ: 実測サイズに合わせてモノを描画（可視領域に必ず収める） */}
      <View style={styles.stage} onLayout={onStageLayout}>
        {measured.w > 0 && measured.h > 0 ? (
          <ThingsStage
            key={`${gameId}-${index}`}
            ref={stageRef}
            problem={problem}
            size={size}
            cols={plan.cols}
            gap={GAP}
            onReady={handleReady}
          />
        ) : null}
      </View>

      {/* 問い */}
      <View style={styles.questionBand}>
        <Text style={styles.question} numberOfLines={1} adjustsFontSizeToFit>
          {problem.op === 'add' ? 'ぜんぶで ' : 'のこりは '}
          {problem.char.ask}?
        </Text>
      </View>

      {/* 選択肢（●●●＋数字） */}
      <View style={styles.answers}>
        {problem.choices.map((c) => (
          <ChoiceButton
            key={c}
            value={c}
            disabled={choicesDisabled}
            shakeNonce={wrongValue === c ? wrongNonce : 0}
            onPress={() => onChoice(c)}
          />
        ))}
      </View>

      {celebrating ? <Confetti /> : null}
      {done ? <ClearOverlay starCount={SET_SIZE} onReplay={newGame} onHome={onHome} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeGlyph: {
    fontSize: 28,
  },
  progress: {
    flexDirection: 'row',
    columnGap: space.sm,
    alignItems: 'center',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stageBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.stageBorder,
    marginVertical: space.sm,
    overflow: 'hidden',
  },
  questionBand: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  question: {
    fontSize: font.title,
    fontWeight: '900',
    color: colors.text,
  },
  answers: {
    flexDirection: 'row',
    columnGap: space.sm,
    paddingBottom: space.sm,
  },
});