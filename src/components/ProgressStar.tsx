// 進捗ドット1つぶん。ふつうは丸ドットだが、その問題をクリアすると⭐に変わる（DESIGN §14）。
// 'star' に切り替わった瞬間だけ「ぽんっ」と小さくポップする（ごほうび獲得の演出）。
// 数字スコアではなく、集めた⭐が並んでいくのを見せる。マイナス表示は一切なし。

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export type StarState = 'off' | 'now' | 'star';

export default function ProgressStar({ state }: { state: StarState }) {
  // pop: 0=これから出る / 1=定位置。'star' に変わった瞬間に 0→1 でポップさせる。
  const pop = useRef(new Animated.Value(state === 'star' ? 1 : 0)).current;
  const prev = useRef<StarState>(state);

  useEffect(() => {
    if (state === 'star' && prev.current !== 'star') {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: false,
      }).start();
    }
    prev.current = state;
  }, [state, pop]);

  return (
    <View style={styles.slot}>
      {state === 'star' ? (
        <Animated.Text
          style={[
            styles.star,
            // spring のオーバーシュートで軽く弾む（extend 補間）。
            { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] },
          ]}
        >
          ⭐
        </Animated.Text>
      ) : (
        <View style={[styles.dot, state === 'now' ? styles.dotNow : styles.dotOff]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // すべてのドット/星を同じ枠に収め、丸⇔星が混在しても横並びの間隔がぶれないようにする。
  slot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotNow: {
    backgroundColor: colors.progressNow,
    transform: [{ scale: 1.25 }],
  },
  dotOff: {
    backgroundColor: colors.progressOff,
  },
});