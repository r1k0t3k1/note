---
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

Build system以外は基本デフォルトでOK

Build systemはGUI Designerを使うためIntelliJ IDEAを選択

2024/2月現在、montoya-apiでのBurp拡張開発はJDK17を使用しないと行けないっぽいのでJDKだけ注意

![image](https://github.com/r1k0t3k1/note/assets/57973603/5b63ae41-eeb9-486a-a6ed-a49d39437739)


# プロジェクトファイル構成設定

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Modules -> + -> New module

![image](https://github.com/r1k0t3k1/note/assets/57973603/cb7ddbcd-5560-4209-bd5c-1646b70d5f57)

親モジュールと同じ設定でOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/10fcc88e-f511-4555-85ce-7aadd0902d69)

こんな感じのモジュール構成にしておく

demo-extensionモジュール -> srcフォルダ -> burpモジュール -> javaフォルダ -> demoパッケージ -> DemoExtensionクラス

![image](https://github.com/r1k0t3k1/note/assets/57973603/cd28fa7b-3033-419e-9316-111c8852fa77)

# MontoyaApiインストール

BurpのMontoyaApiを使うためのライブラリをインポートする

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Libraries -> + From Maven...

![image](https://github.com/r1k0t3k1/note/assets/57973603/9fff3dea-3136-4d04-a7e8-76cb22bef8a7)

montoya-apiの最新版を選択

![image](https://github.com/r1k0t3k1/note/assets/57973603/7cdbc375-2a49-4cb4-ab2e-b57b77dcdd56)

子モジュールに追加する(今回はburpモジュール)

![image](https://github.com/r1k0t3k1/note/assets/57973603/4958a944-2a5f-471e-a1ef-8fbc86d22c50)


# BurpExtensionの実装

自動生成されているMainファイルを好きなファイル名・クラス名に変更し、そのクラスにBurpExtensionインターフェースを実装する

BurpExtensionインターフェースは`MontoyaApi`クラスを引数に取る`initialize`メソッドがあればOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/e4fe4cef-d1e9-46e9-917b-387f81588e2d)

この状態でビルドに通ればMontoyaApiのインポートはOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/b94a8638-b8dc-4dd0-aa61-8eb3b586f8d4)

# Artifact生成の設定

前の手順でビルドしただけではBurpにロードするjarが生成されないので生成するように設定する

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Artifact -> + -> JAR -> From modules with dependencies...

![image](https://github.com/r1k0t3k1/note/assets/57973603/bb95e005-0cf4-4494-b48a-bd8a63f02a56)

デフォルトでOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/4f691a25-451a-4385-a316-789546941b69)

Include in project build...をON

![image](https://github.com/r1k0t3k1/note/assets/57973603/6b5f750e-b44d-4e6c-abae-22b1bc32e487)


この状態でビルドするとjarが生成される

![image](https://github.com/r1k0t3k1/note/assets/57973603/e6353159-8eb1-4322-b0e0-96abbbe7bb9f)
