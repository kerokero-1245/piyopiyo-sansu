// さんすうアプリのルート。react-navigation は使わず、文字ヘッダの無い全画面遷移にするための
// 最小ステートルーター。縦持ち前提のレイアウト（中央寄せ・最大幅制限）で横画面・大画面でも
// 崩れにくくする（DESIGN §8）。

import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Route } from './src/types';
import { colors, space } from './src/theme';
import TitleScreen from './src/screens/TitleScreen';
import PlayScreen from './src/screens/PlayScreen';
import OtonaScreen from './src/screens/OtonaScreen';

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'title' });
  const go = useCallback((r: Route) => setRoute(r), []);

  let screen: React.ReactNode = null;
  switch (route.name) {
    case 'title':
      screen = (
        <TitleScreen onPlay={() => go({ name: 'play' })} onOtona={() => go({ name: 'otona' })} />
      );
      break;
    case 'play':
      // 入るたびに新しい5問で始める（PlayScreen が生成）。
      screen = <PlayScreen onHome={() => go({ name: 'title' })} />;
      break;
    case 'otona':
      screen = <OtonaScreen onBack={() => go({ name: 'title' })} />;
      break;
  }

  return (
    <View style={styles.root}>
      <View style={styles.frame}>{screen}</View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    paddingTop: space.lg,
    paddingBottom: space.md,
    paddingHorizontal: space.md,
  },
});