// expo・expo-* の差し替え（tests/register.mjs が向ける）。StatusBar（expo-status-bar）は piyo-assets の testing/ の既定の
// 差し替えのもの。このアプリの分は index.ts の registerRootComponent（expo）だけ。
export * from "@kerokero-1245/piyo-assets/testing/stubs/expo";

export function registerRootComponent() {}
