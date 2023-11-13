---
title: "Flare-On Challenge 2023\nWriteup (#1, #2)"
id: "flare-on-challenge-2023"
description: "Flare-On Challenge 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-11-13"
isDraft: true
---

## Flare-On Challengeとは
FireEye社が毎年開催しているReverse Engineeringの技術を問われるCTFです。
実際のマルウェアから発想を得た問題を出題する傾向があり、PEファイルの解析が多いようです。
また、通常のCTFとは違い、簡単な問題から順番に出題されるようになっており、問題を解かなければ次の問題が出題されない形式となっています。

# X

Windowsアプリケーションの実行ファイル一式が与えられます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/644ed170-a27e-467c-ac63-b94a8cb435b8)

`X.exe`と`X.dll`の表層解析を行うと`X.dll`が.NETのruntime上で動作するアプリケーションだということがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/b9d407cc-88d5-4dd8-941a-dc4d1788c0f3)

![image](https://github.com/r1k0t3k1/note/assets/57973603/dcec2ad3-7370-4e3f-878a-62418cf82ad3)

`X.dll`をiLSpyで中間言語から復元します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/32b40f1b-67cf-4550-a8ab-1cfd8ca8d8f3)

`monogame1`名前空間以下にゲームロジックのようなものが実装されていることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d3cfa928-6f56-4bff-87c6-4179d5f03fd3)

このうち、`Game1`クラス内に何かしらの値が`42`になった際にフラグが表示される処理がありました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/c7421a06-4dfc-41fe-9bff-3a26f7afddf4)

フラグ文字列が取得できたので問題自体は解けたのですが、一応exeを起動してみると以下のようになりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/398f802e-c3f4-4b66-a537-779a79984ae4)

7セグを`42`に設定して錠マークをクリックするとフラグが表示されます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/910b8780-cc94-48a6-8d4f-9ec4aa2ec911)

## ItsOnFire

`ItsOnFire.apk`というアンドロイドアプリケーションが渡されます。

`jadx`でソースコードを復元してみると、アプリケーションID`com.secure.itsonfire`にインベーダーゲーム？が実装されているようです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/9f568563-7ed6-400a-b98a-36c620a94ae4)

しばらくソースコードを確認していると`Resources/res/raw`に画像ファイルが配置されていることがわかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/11aa36ef-3160-4a72-9188-89cd85cf1d4a)

ただし、これらの画像ファイルはpngとしてInvalidであり、ビューアなどでは開けませんでした。

ファイルのエントロピーを確認してみるとどちらも暗号化されている可能性があることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/eb11d0ec-b8b7-4c9e-951b-0fc9d8c26e09)

よってソースコード内にこれらを復号する処理がある可能性があることを念頭に置いて調査を継続しました。


com.secure.itsonfire.MessageWorker.onMessageReceived
(MessageWorkerはFirebaseMessagingServiceを継承している)
c.c.a ()
b.b.f ()
f.b.c (ファイル生成)
-> f.b.d (Key生成)
  -> f.b.a (CRC32)
-> f.b.b (AES256-CBC Decrypt)



