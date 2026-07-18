// 1セット（5問）ぜんぶ終わったときの「きょうの がんばりカード」（DESIGN §14）。
// できたね!画面を進化させ、集めた⭐を1つずつ順に出す（数え上げのトーン）→ 5つ揃って祝福。
// その下に「あつめた ほし ⭐×N」（累計）を控えめに表示。スコアも罰も出さない（DESIGN §4）。
//
// ⭐の累計は PlayScreen が1問クリアごとに settings へ加算済み。ここでは読むだけ。

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '../theme';
import BigButton from './BigButton';
import Confetti from './Confetti';
import { getTotalStars, getTtsOn } from '../settings';
import { playCountTone, playSound } from '../audio/sounds';
import { sayPhrase } from '../audio/voice';

// ⭐ はシールポップ画風の素材（ほし）に差し替え。まだ集めていないスロットは薄く表示する。
const HOSHI = require('../../assets/svg/hoshi.svg');

interface Props {
  starCount: number; // このセットで集めた⭐の数（=5）
  onReplay: () => void;
  onHome: () => void;
}

// カード上の⭐スロット1つ。まだ出ていないときは薄い☆、出た瞬間に⭐が「ぽんっ」と現れる。
function CardStar({ filled }: { filled: boolean }) {
  const pop = useRef(new Animated.Value(filled ? 1 : 0)).current;
  const prev = useRef(filled);
  useEffect(() => {
    if (filled && !prev.current) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 130, useNativeDriver: false }).start();
    }
    prev.current = filled;
  }, [filled, pop]);

  if (!filled) {
    return (
      <View style={styles.starSlot}>
        <Image source={HOSHI} resizeMode="contain" style={styles.starEmpty} />
      </View>
    );
  }
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const opacity = pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] });
  return (
    <View style={styles.starSlot}>
      <Animated.Image
        source={HOSHI}
        resizeMode="contain"
        style={[styles.starFull, { opacity, transform: [{ scale }] }]}
      />
    </View>
  );
}

export default function ClearOverlay({ starCount, onReplay, onHome }: Props) {
  // 累計は既に加算済み。マウント時に一度だけ読む。
  const total = useRef(getTotalStars()).current;

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
      <View style={styles.backdrop} pointerEvents="none" />
      {gathered ? <Confetti /> : null}

      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.title}>きょうの がんばりカード</Text>

        <View style={styles.stars}>
          {Array.from({ length: starCount }, (_, i) => (
            <CardStar key={i} filled={i < shown} />
          ))}
        </View>

        {/* 5つ揃ったら「できたね!」。揃うまでは高さを確保して見た目が跳ねないようにする。 */}
        <View style={styles.doneSlot}>
          {gathered ? <Text style={styles.doneText}>ぜんぶ できたね!</Text> : null}
        </View>

        {/* 累計コレクション（控えめ・数字スコアではなく“集めた⭐の数”） */}
        <View style={styles.totalRow}>
          <Text style={styles.total}>あつめた ほし </Text>
          <Image source={HOSHI} resizeMode="contain" style={styles.totalStar} />
          <Text style={styles.total}> × {total}</Text>
        </View>
      </Animated.View>

      <View style={styles.buttons}>
        <BigButton
          emoji="🔁"
          label="もういちど"
          onPress={onReplay}
          color={colors.play}
          pressedColor={colors.playPressed}
        />
        <BigButton emoji="🏠" label="おうちへ" onPress={onHome} />
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.md,
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
    maxWidth: 380,
    width: '100%',
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: '#00000066',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: space.xs,
    rowGap: space.xs,
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
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.xs,
  },
  doneText: {
    fontSize: 28,
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
  buttons: {
    width: '100%',
    maxWidth: 360,
    rowGap: space.sm,
  },
});