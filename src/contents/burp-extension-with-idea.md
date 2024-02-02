[---
title: "Burp Suite拡張の作成を楽にするメモ\nWith IntelliJ IDEA"
id: "burp-extension-with-idea"
description: "Burp Suite拡張作成のメモです。"
author: "rikoteki"
createdAt: "2024-02-01"
isDraft: true
---

# ToC

# はじめに

Burp Suiteの拡張用APIが変更になり`montoya-api`というものに変わっていたのでAPI移行のついでに開発環境を整えるかぁ〜となりましたが、予想外に四苦八苦したのでメモを残します。

そして流石にIDE使った方が便利かぁ？と思いIntelliJ IDEAでBurp拡張を作ることにしました。

正直Java + IDEAよくわかってないので改善点あれば教えてください。

# IntelliJ IDEAのインストール

jetbrainsの公式ページからCommunity版をダウンロード

Community版のダウンロードリンクは下の方にあるので注意

https://www.jetbrains.com/ja-jp/idea/download/

# gradle のインストール

下記公式ページからダウンロード→解凍→パスを通す

https://gradle.org/install/#manually

# プロジェクトの作成

Intellij IDEAで新規プロジェクトを作成する

基本デフォルトでOK

2024/2月現在、montoya-apiでのBurp拡張開発はJDK17を使用しないと行けないっぽいのでJDKだけ注意

　（後で気づいたけど`Build system`はGUI Designerを使う都合上IntelliJでいいかも）

![image](https://github.com/r1k0t3k1/note/assets/57973603/75aa7eb1-9ed5-43be-8f92-90745d7111fe)

# 
