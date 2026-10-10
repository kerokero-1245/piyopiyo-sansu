// expo・expo-* の差し替え。どのパッケージの import もここへ向く（名前は重ならない）。
// App.tsx の StatusBar（expo-status-bar）と index.ts の registerRootComponent（expo）が、いま使っている全部。

export function StatusBar() {
  return null;
}

export function registerRootComponent() {}
