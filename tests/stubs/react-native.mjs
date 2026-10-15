// react-native の差し替え（tests/register.mjs が "react-native" をここへ向ける）。本物は Flow 記法で、Node では読めない。
// 中身は piyo-assets の testing/ の既定の差し替え（Platform.OS は "web" から始まり、テストが書き換えて native の動きを見る）。
// このアプリのテストが読む src に、それ以外の名前は要らない。足りない名前は、ここに export を足す。
export * from "@kerokero-1245/piyo-assets/testing/stubs/react-native";
