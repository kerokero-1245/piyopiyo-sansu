// 1セット（5問）ぜんぶ終わったときの祝福オーバーレイ。紙吹雪＋「ぜんぶ できたね!」＋
// 「もういちど」（新しい5問）/「おうちへ」。罰やスコアは出さない（DESIGN §4）。

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, font, space } from '../theme';
import BigButton from './BigButton';
import Confetti from './Confetti';

interface Props {
  onReplay: () => void;
  onHome: () => void;
}

export default function ClearOverlay({ onReplay, onHome }: Props) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.backdrop} pointerEvents="none" />
      <Confetti />

      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.circle}>
          <Text style={styles.emoji}>🎉</Text>
        </View>
        <Text style={styles.headline}>ぜんぶ できたね!</Text>
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
    padding: space.lg,
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
    marginBottom: space.xl,
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.countHalo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.white,
    shadowColor: '#00000066',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  emoji: {
    fontSize: 104,
    lineHeight: 120,
  },
  headline: {
    marginTop: space.md,
    fontSize: font.huge,
    fontWeight: '900',
    color: colors.white,
    textShadowColor: '#00000088',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  buttons: {
    width: '100%',
    maxWidth: 360,
    rowGap: space.sm,
  },
});