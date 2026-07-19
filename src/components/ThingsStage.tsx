// つづきものステージ（DESIGN §15）。1セット5問を通して「同じグループ」が画面に残り続ける。
// 各問で開始数（before＝前問の答え）の上に増減がその場で起きるのを見せ、変化が終わってから
// 親が問い・選択肢を出す（経過を見ないと問いが始まらない）。正解/不正解のあとに 1つずつ
// ハイライトして「1…2…3!」と数え上げる。
//
// アニメは React Native 標準 Animated のみ。1セットごとに親が key(gameId) を変えて作り直す前提で、
// セットの途中（問題ごと）は remount しない（グループを持ち越すため）。モノは絶対配置＋translate で
// 置き、数が変わるたびに中央そろえの位置へリフロー（＝同じモノが残って寄り集まる/散る）。
//
// レイアウトの約束（おつかいめいろの教訓 / DESIGN §8）:
//   モノの1辺 size は「このお話で出る最大数 maxCount」に合わせて親が実測領域から算出して渡す。
//   セット中は size を変えない（持ち越したモノがガタつかない）。どの数でも可視領域に必ず収まる。

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';
import { CharDef, Op, Step } from '../types';
import { gridPlan } from '../game/grid';
import { playCountTone, playSound } from '../audio/sounds';

// 素材SVG（viewBox 内に余白が焼き込まれている）を、絵文字と同等の存在感にするための描画倍率。
const OBJ_SCALE = 1.12;
// ステージ上部に浮かべる数え上げバッジ帯の高さ。モノはこの下の領域に中央そろえで置く。
const BADGE_H = 72;

export interface ThingsStageHandle {
  // いま画面に居るモノを 1..present まで順に数え上げる。slow=不正解後のゆっくり提示。
  countUp: (onDone: () => void, slow: boolean) => void;
  // ハイライトと数字表示を消す（不正解後の再挑戦前に呼ぶ）。
  reset: () => void;
  // 直前の増減を「もう一度・ゆっくり」目の前で再演する（不正解デモの導入）。
  replayDelta: (onDone: () => void) => void;
}

interface Props {
  char: CharDef; // このお話の主役（セット内で不変）
  initialCount: number; // 最初に登場するグループ数（＝steps[0].before）
  step: Step; // いまの問題の増減
  stepIndex: number; // 何問目か（0..）。変わると次の増減アニメが走る
  maxCount: number; // このお話で出る最大数（モノのスロット数・サイズ計算の基準）
  size: number; // モノ1つの1辺（セット内で不変）
  gap: number; // モノの間隔
  stageW: number; // ステージの実測幅
  stageH: number; // ステージの実測高
  onReady?: () => void; // 増減アニメが終わって回答可能になった
  onDeltaStart?: (op: Op) => void; // 増減が始まった（親が「きたよ！」/「かえったよ」を鳴らす）
}

const ThingsStage = forwardRef<ThingsStageHandle, Props>(function ThingsStage(
  { char, initialCount, step, stepIndex, maxCount, size, gap, stageW, stageH, onReady, onDeltaStart },
  ref
) {
  // モノ maxCount 個ぶんの Animated 値をセット開始時に一度だけ用意する（セット中は remount しない）。
  // enter: 存在（0=いない/1=いる、透明度＋登場スケール）。pop: 数え上げハイライト。posX/posY: 置き場所。
  const enterRef = useRef<Animated.Value[]>([]);
  const popRef = useRef<Animated.Value[]>([]);
  const posXRef = useRef<Animated.Value[]>([]);
  const posYRef = useRef<Animated.Value[]>([]);
  if (enterRef.current.length !== maxCount) {
    enterRef.current = Array.from({ length: maxCount }, () => new Animated.Value(0));
    popRef.current = Array.from({ length: maxCount }, () => new Animated.Value(0));
    posXRef.current = Array.from({ length: maxCount }, () => new Animated.Value(0));
    posYRef.current = Array.from({ length: maxCount }, () => new Animated.Value(0));
  }
  const enter = enterRef.current;
  const pop = popRef.current;
  const posX = posXRef.current;
  const posY = posYRef.current;

  // 数え上げの大きな数字（null=非表示）。画面に居るモノの数（テスト用マーカー兼ロジック）。
  const [count, setCount] = useState<number | null>(null);
  const [presentCount, setPresentCount] = useState(0);
  const presentRef = useRef(0);
  const setPresent = (n: number) => {
    presentRef.current = n;
    setPresentCount(n);
  };

  // 遅延実行はまとめて破棄できるようにしておく（画面離脱・remount で止める）。
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    []
  );

  // レイアウト依存の値は遅延タイマー内でも最新を読めるよう ref に写す。
  const dimsRef = useRef({ stageW, stageH, size, gap });
  dimsRef.current = { stageW, stageH, size, gap };

  // n 個を中央そろえに置いたときの各モノの座標（左上原点、バッジ帯の下）。
  const positionsFor = (n: number): { x: number; y: number }[] => {
    const { stageW: W, stageH: H, size: S, gap: G } = dimsRef.current;
    if (n <= 0) return [];
    // 列数・行数は PlayScreen の computeThingSize と同じ共有ロジック（src/game/grid.ts）を使う。
    const { cols, rows } = gridPlan(n);
    const gridH = rows * S + (rows - 1) * G;
    const contentH = Math.max(0, H - BADGE_H);
    const originY = BADGE_H + Math.max(0, (contentH - gridH) / 2);
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const rowStart = row * cols;
      const rowCount = Math.min(cols, n - rowStart);
      const rowW = rowCount * S + (rowCount - 1) * G;
      const originX = Math.max(0, (W - rowW) / 2);
      const col = i - rowStart;
      out.push({ x: originX + col * (S + G), y: originY + row * (S + G) });
    }
    return out;
  };

  // 最初のグループがぽんっと登場する（1つずつ・軽い間）。終わったら onDone。
  const runIntro = (onDone: () => void) => {
    const pos = positionsFor(initialCount);
    for (let i = 0; i < initialCount; i++) {
      posX[i].setValue(pos[i].x);
      posY[i].setValue(pos[i].y);
      enter[i].setValue(0);
    }
    const stepMs = 150;
    for (let i = 0; i < initialCount; i++) {
      later(() => {
        playSound('appear');
        Animated.spring(enter[i], { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }).start();
      }, i * stepMs);
    }
    later(() => {
      setPresent(initialCount);
      onDone();
    }, initialCount * stepMs + 280);
  };

  // before → answer の増減を目の前で見せる。add=1匹ずつ歩いて入って整列 / sub=1匹ずつ帰る。
  // 残るモノは新しい中央そろえ位置へリフロー。speak=true なら onDeltaStart で声を鳴らす。
  const runDelta = (
    before: number,
    answer: number,
    op: Op,
    slow: boolean,
    speak: boolean,
    onDone: () => void
  ) => {
    pop.forEach((v) => v.setValue(0));
    setCount(null);
    setPresent(before); // 開始時＝前問の答え（持ち越し）をマーカーに出す
    const { size: S, stageW: W } = dimsRef.current;
    const target = positionsFor(answer);
    const stepMs = slow ? 620 : 400;
    const startDelay = slow ? 300 : 200;

    // 残る/寄り集まるモノを新しい位置へ（add は before 個、sub は answer 個が残る）。
    const keep = op === 'add' ? before : answer;
    for (let i = 0; i < keep; i++) {
      Animated.spring(posX[i], { toValue: target[i].x, friction: 7, tension: 70, useNativeDriver: false }).start();
      Animated.spring(posY[i], { toValue: target[i].y, friction: 7, tension: 70, useNativeDriver: false }).start();
    }

    // 増減するモノ（add=末尾に増える / sub=末尾から帰る）。
    const changing: number[] = [];
    if (op === 'add') {
      for (let i = before; i < answer; i++) changing.push(i);
    } else {
      for (let i = before - 1; i >= answer; i--) changing.push(i);
    }

    if (speak) onDeltaStart?.(op);

    changing.forEach((i, k) => {
      later(() => {
        if (op === 'add') {
          // 画面右の外から その子の整列位置へ歩いてくる。
          posX[i].setValue(W + S * 0.6);
          posY[i].setValue(target[i].y);
          enter[i].setValue(0);
          playSound('appear');
          Animated.spring(posX[i], { toValue: target[i].x, friction: 6, tension: 70, useNativeDriver: false }).start();
          Animated.spring(enter[i], { toValue: 1, friction: 5, tension: 80, useNativeDriver: false }).start();
        } else {
          // ふわっと上へ帰りながら消える。
          playSound('eat');
          Animated.timing(enter[i], {
            toValue: 0,
            duration: slow ? 460 : 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }).start();
          Animated.timing(posY[i], {
            toValue: -S,
            duration: slow ? 520 : 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }).start();
        }
      }, startDelay + k * stepMs);
    });

    const total = startDelay + Math.max(1, changing.length) * stepMs + (slow ? 420 : 340);
    later(() => {
      setPresent(answer);
      onDone();
    }, total);
  };

  // いまの問題の before/answer/op を保持（不正解デモの replayDelta で使う）。
  const lastStepRef = useRef<{ before: number; answer: number; op: Op }>({
    before: initialCount,
    answer: initialCount,
    op: 'add',
  });

  // stepIndex が進むたびにその問題の増減アニメを走らせる。最初（マウント時）は登場→第1問の増減。
  const stepRef = useRef(step);
  stepRef.current = step;
  const introDoneRef = useRef(false);
  useEffect(() => {
    const s = stepRef.current;
    lastStepRef.current = { before: s.before, answer: s.answer, op: s.op };
    if (!introDoneRef.current) {
      introDoneRef.current = true;
      runIntro(() => runDelta(s.before, s.answer, s.op, false, true, () => onReady?.()));
    } else {
      runDelta(s.before, s.answer, s.op, false, true, () => onReady?.());
    }
    // stepIndex ごとに1回。step は stepRef で最新を読む。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useImperativeHandle(ref, () => ({
    countUp(onDone, slow) {
      const n = presentRef.current;
      pop.forEach((v) => v.setValue(0));
      const stepFn = (i: number) => {
        if (i >= n) {
          setCount(n);
          later(onDone, slow ? 550 : 400);
          return;
        }
        setCount(i + 1);
        playCountTone(i);
        Animated.spring(pop[i], { toValue: 1, friction: 4, tension: 130, useNativeDriver: false }).start();
        // 通常モードは 11個目以降（i>=10）を少しテンポアップ（440→330）。長い数え上げを間延びさせない。
        // まちがい後のゆっくり提示（slow）は最後まで一定のゆっくりのまま（学びの反復は急がせない）。
        const stepMs = slow ? 680 : i >= 10 ? 330 : 440;
        later(() => stepFn(i + 1), stepMs);
      };
      stepFn(0);
    },
    reset() {
      pop.forEach((v) => v.setValue(0));
      setCount(null);
    },
    replayDelta(onDone) {
      // 直前の増減を「もう一度・ゆっくり」再演。まず before の状態へ瞬時に戻し、
      // そこから増減をゆっくり流し直す（声は鳴らさない＝デモに集中）。
      const s = lastStepRef.current;
      const beforePos = positionsFor(s.before);
      for (let i = 0; i < maxCount; i++) {
        pop[i].setValue(0);
        if (i < s.before) {
          enter[i].setValue(1);
          posX[i].setValue(beforePos[i].x);
          posY[i].setValue(beforePos[i].y);
        } else {
          enter[i].setValue(0);
        }
      }
      setCount(null);
      // 再演はふつうの速さ（間延びさせない）。このあと親がゆっくり数え上げを続ける。
      runDelta(s.before, s.answer, s.op, false, false, onDone);
    },
  }));

  return (
    <View style={styles.wrap}>
      {/* 数え上げの大きな数字（1→2→3）。ステージ上部に浮かせる。 */}
      <View style={styles.badgeSlot} pointerEvents="none">
        {count !== null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </View>

      {/* モノ（絶対配置＋translate）。可視領域内に中央そろえ。 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {enterRef.current.map((e, i) => {
          const scaleEnter = e.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
          const popScale = pop[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
          const scale = Animated.multiply(scaleEnter, popScale);
          const imgSize = size * OBJ_SCALE;
          return (
            <Animated.View
              key={i}
              style={[
                styles.slot,
                {
                  width: size,
                  height: size,
                  opacity: e,
                  transform: [{ translateX: posX[i] }, { translateY: posY[i] }, { scale }],
                },
              ]}
            >
              {/* 数えたときにともる やわらかい光 */}
              <Animated.View
                style={[
                  styles.halo,
                  {
                    borderRadius: size,
                    opacity: pop[i],
                    transform: [{ scale: pop[i].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                  },
                ]}
              />
              <Animated.Image
                source={char.svg}
                resizeMode="contain"
                accessibilityLabel={char.emoji}
                style={{ width: imgSize, height: imgSize }}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* テスト用: いま画面に居るモノの数（不可視）。増減の経過・持ち越しを実測する足場。 */}
      <Text testID="present-count" style={styles.hidden} pointerEvents="none">
        {presentCount}
      </Text>
    </View>
  );
});

export default ThingsStage;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  badgeSlot: {
    height: BADGE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.countBadge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: '#00000055',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  badgeText: {
    fontSize: font.title,
    fontWeight: '900',
    color: colors.white,
  },
  slot: {
    // モノ1つぶんの枠（絶対配置）。halo（絶対配置）と、少し大きめの素材画像を中央にそろえる。
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.countHalo,
    borderWidth: 3,
    borderColor: colors.countRing,
  },
  hidden: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: 1,
    opacity: 0,
  },
});
