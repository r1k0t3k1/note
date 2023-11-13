---
title: "Flare-On Challenge 2023\nWriteup (#1, #2)"
id: "flare-on-challenge-2023"
description: "Flare-On Challenge 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-11-13"
isDraft: false
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

またしばらく調査を続けるとソースコード内に`com.secure.itsonfire.MessageWorker.onMessageReceived`を起点とする復号の処理が存在することがわかりました。

復号処理に至るまでの関数呼び出しは以下のようになっています。

1. com.secure.itsonfire.MessageWorker.onMessageReceived
(MessageWorkerはFirebaseMessagingServiceを継承している)
2. c.c.a (onMessageReceivedで受信したデータによる処理の分岐)
3. b.b.f (4のラッパー？)
4. b.b.c (ファイル復号＆保存)

また4の処理で以下の処理が呼ばれていることがわかりました。

- b.b.d (Key生成)
- b.b.a (CRC32)
- b.b.b (復号)

順を追って調査していきます。

まず`onMessageReceived`によって`c.c.a`が呼ばれます。

処理は以下のようになっており、`onMessageReceived`から渡ってきた`param`の値によって`b.b.f(bVar.f)`に渡す`i3`の値を分岐させています。
`i3`の値は`R.raw.ps`か`R.raw.iv`のどちらか、即ち暗号化されたファイルのどちらかになります。

```java
@Nullable
    public final PendingIntent a(@NotNull Context context, @NotNull String param) {
        String string;
        int i2;
        b bVar;
        int i3;
        Intrinsics.checkNotNullParameter(context, "context");
        Intrinsics.checkNotNullParameter(param, "param");
        Intent intent = new Intent();
        if (!Intrinsics.areEqual(param, context.getString(R.string.m1))) {
            if (Intrinsics.areEqual(param, context.getString(R.string.t1))) {
                bVar = b.f360a;
                i3 = R.raw.ps;
            } else if (Intrinsics.areEqual(param, context.getString(R.string.w1))) {
                bVar = b.f360a;
                i3 = R.raw.iv;
            } else if (Intrinsics.areEqual(param, context.getString(R.string.t2))) {
                intent.setAction(context.getString(R.string.av));
                i2 = R.string.t3;
            } else if (!Intrinsics.areEqual(param, context.getString(R.string.f1))) {
                if (Intrinsics.areEqual(param, context.getString(R.string.s1)) || Intrinsics.areEqual(param, context.getString(R.string.s2))) {
                    intent.setAction(context.getString(R.string.av));
                    string = context.getString(R.string.s3);
                    intent.setData(Uri.parse(string));
                }
                return PendingIntent.getActivity(context, 100, intent, 201326592);
            } else {
                intent.setAction(context.getString(R.string.av));
                i2 = R.string.f3;
            }
            return PendingIntent.getActivity(context, 100, bVar.f(context, i3), 201326592);
        }
        intent.setAction(context.getString(R.string.ad));
        i2 = R.string.m2;
        string = context.getString(i2);
        intent.setData(Uri.parse(string));
        return PendingIntent.getActivity(context, 100, intent, 201326592);
    }

```

`b.b.f`では`b.b.c`が呼ばれます。

最後のほうに`FilesKt.writeBytes`があることからファイルの書き込みをしているっぽいことがわかります。

そこに至るまでの処理は`e(ファイル読み込み)` → `b.b.d` → `new SecretKeySpec(鍵生成)` → `b.b.b`となっています。

```java
    private final File c(int i2, Context context) {
        Resources resources = context.getResources();
        Intrinsics.checkNotNullExpressionValue(resources, "context.resources");
        byte[] e2 = e(resources, i2);
        String d2 = d(context);
        Charset charset = Charsets.UTF_8;
        byte[] bytes = d2.getBytes(charset);
        Intrinsics.checkNotNullExpressionValue(bytes, "this as java.lang.String).getBytes(charset)");
        SecretKeySpec secretKeySpec = new SecretKeySpec(bytes, context.getString(R.string.ag));
        String string = context.getString(R.string.alg);
        Intrinsics.checkNotNullExpressionValue(string, "context.getString(R.string.alg)");
        String string2 = context.getString(R.string.iv);
        Intrinsics.checkNotNullExpressionValue(string2, "context.getString(\n     …             R.string.iv)");
        byte[] bytes2 = string2.getBytes(charset);
        Intrinsics.checkNotNullExpressionValue(bytes2, "this as java.lang.String).getBytes(charset)");
        byte[] b2 = b(string, e2, secretKeySpec, new IvParameterSpec(bytes2));
        File file = new File(context.getCacheDir(), context.getString(R.string.playerdata));
        FilesKt.writeBytes(file, b2);
        return file;
    }

```

`b.b.e`は単純にファイルを読み込む処理でしたので解析はスキップします。

次に`b.b.d`の処理を確認します。

```java
    private final String d(Context context) {
        String string = context.getString(R.string.c2);
        Intrinsics.checkNotNullExpressionValue(string, "context.getString(R.string.c2)");
        String string2 = context.getString(R.string.w1);
        Intrinsics.checkNotNullExpressionValue(string2, "context.getString(R.string.w1)");
        StringBuilder sb = new StringBuilder();
        sb.append(string.subSequence(4, 10));
        sb.append(string2.subSequence(2, 5));
        String sb2 = sb.toString();
        Intrinsics.checkNotNullExpressionValue(sb2, "StringBuilder().apply(builderAction).toString()");
        byte[] bytes = sb2.getBytes(Charsets.UTF_8);
        Intrinsics.checkNotNullExpressionValue(bytes, "this as java.lang.String).getBytes(charset)");
        long a2 = a(bytes);
        StringBuilder sb3 = new StringBuilder();
        sb3.append(a2);
        sb3.append(a2);
        String sb4 = sb3.toString();
        Intrinsics.checkNotNullExpressionValue(sb4, "StringBuilder().apply(builderAction).toString()");
        return StringsKt.slice(sb4, new IntRange(0, 15));
    }

```

ここでは`R.string.c2`と`R.string.w1`を元に文字列が生成されていることがわかります。

この二つは`res/values/strings.xml`にて以下のように定義されています。

```xml
<string name="c2">https://flare-on.com/evilc2server/report_token/report_token.php?token=</string>
<string name="w1">wednesday</string>
```

この文字列を元に`b.b.d`の処理をPythonで再現すると以下のようになります。

```python
import binascii
c2 = b"https://flare-on.com/evilc2server/report_token/report_token.php?token="
w1 = b"wednesday"

key = (str(binascii.crc32(c2[4:10]+w1[2:5])).encode("utf-8")*2)[0:16]
```
また、`b.b.a`が呼ばれている箇所がありますが、`b.b.a`は単純なCRC32計算のみでした。

`b.b.d`で生成した文字列は`b.b.c`内で`new secretKeySpec`の第一引数として渡されます。

第二引数の`R.string.ag`はres/values/strings.xml`にて以下のように定義されています。

```xml
<string name="ag">AES</string>
```

その後、`R.string.alg`、`R.string.iv`が参照されます。

これらはres/values/strings.xml`にて以下のように定義されています。

```xml
<string name="alg">AES/CBC/PKCS5Padding</string>
<string name="iv">abcdefghijklmnop</string>
```

そして、`b.b.b`に対して以下が渡されます。

- string(アルゴリズムを指定する文字列)
- e2(読み込んだファイル)
- 鍵
- IV

```java
byte[] b2 = b(string, e2, secretKeySpec, new IvParameterSpec(bytes2));
```

`b.b.b`はパラメータを使用して復号を行う処理です。

(`cipher.init`の第一引数`2`は`DECRYPT_MODE`を表します。)

```java
    private final byte[] b(String str, byte[] bArr, SecretKeySpec secretKeySpec, IvParameterSpec ivParameterSpec) {
        Cipher cipher = Cipher.getInstance(str);
        cipher.init(2, secretKeySpec, ivParameterSpec);
        byte[] doFinal = cipher.doFinal(bArr);
        Intrinsics.checkNotNullExpressionValue(doFinal, "cipher.doFinal(input)");
        return doFinal;
    }
```

ここまでで復号に必要な情報が揃っているのでスクリプトを書きます。

- 暗号化されたデータ
- アルゴリズム
- IV
- 鍵

```python
from Crypto.Cipher import AES
import binascii

c2 = b"https://flare-on.com/evilc2server/report_token/report_token.php?token="
w1 = b"wednesday"
iv = b"abcdefghijklmnop"

key = (str(binascii.crc32(c2[4:10]+w1[2:5])).encode("utf-8")*2)[0:16]

aes = AES.new(key, AES.MODE_CBC, iv)

iv_png = open("C:\\Users\\rikoteki\\Desktop\\Repository\\flare-on\\ItsOnFire\\app\\src\\main\\res\\raw\\iv.png", "rb").read()
ps_png = open("C:\\Users\\rikoteki\\Desktop\\Repository\\flare-on\\ItsOnFire\\app\\src\\main\\res\\raw\\ps.png", "rb").read()

open("./dec_iv.png", "wb").write(aes.decrypt(iv_png))
open("./dec_ps.png", "wb").write(aes.decrypt(ps_png))
```

このスクリプトを実行すると画像が復号され、`iv.png`にフラグが描画されていました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/942ff01f-65ce-4e72-8aa7-0e86e7e16cf7)

