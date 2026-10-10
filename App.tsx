// さんすうアプリのルート。react-navigation は使わず、文字ヘッダの無い全画面遷移にするための
// 最小ステートルーター。縦持ち前提のレイアウト（中央寄せ・最大幅制限）で横画面・大画面でも
// 崩れにくくする（DESIGN §8）。背の低い横向き（スマホの横持ち）では枠の上下の余白を詰め、
// もんだい画面だけ枠を広げてステージと選択肢を左右に並べる（src/layout.ts）。

import React, { useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Route } from "./src/types";
import { colors, space } from "./src/theme";
import {
  FRAME_MAX_W,
  FRAME_MAX_W_WIDE,
  FRAME_PAD_BOTTOM,
  FRAME_PAD_COMPACT,
  FRAME_PAD_TOP,
  isCompactLandscape,
} from "./src/layout";
import TitleScreen from "./src/screens/TitleScreen";
import PlayScreen from "./src/screens/PlayScreen";
import OtonaScreen from "./src/screens/OtonaScreen";

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "title" });
  const go = useCallback((r: Route) => setRoute(r), []);
  const { width: windowW, height: windowH } = useWindowDimensions();
  const compact = isCompactLandscape(windowW, windowH);

  let screen: React.ReactNode = null;
  switch (route.name) {
    case "title":
      screen = (
        <TitleScreen
          onPlay={() => go({ name: "play" })}
          onOtona={() => go({ name: "otona" })}
        />
      );
      break;
    case "play":
      // 入るたびに新しい5問で始める（PlayScreen が生成）。
      screen = <PlayScreen onHome={() => go({ name: "title" })} />;
      break;
    case "otona":
      screen = <OtonaScreen onBack={() => go({ name: "title" })} />;
      break;
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.frame,
          compact && styles.frameCompact,
          compact && route.name === "play" && styles.frameWide,
        ]}
      >
        {screen}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: FRAME_MAX_W,
    paddingTop: FRAME_PAD_TOP,
    paddingBottom: FRAME_PAD_BOTTOM,
    paddingHorizontal: space.md,
  },
  // 背の低い横向き: 上下の余白を詰める（どの画面も）。
  frameCompact: {
    paddingTop: FRAME_PAD_COMPACT,
    paddingBottom: FRAME_PAD_COMPACT,
  },
  // 背の低い横向きのもんだい画面: ステージと選択肢を左右に並べるので枠を広げる。
  frameWide: {
    maxWidth: FRAME_MAX_W_WIDE,
  },
});
