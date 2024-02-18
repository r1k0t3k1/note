---
title: "検証用Androidを買ったので\nFrida Labをやってみる"
id: "android-frida-lab"
description: "Frida Labをやってみました"
author: "rikoteki"
createdAt: "2024-02-18"
isDraft: true
---

# ToC

# Lab 0x1

任意の数値を入力し、それが正しい場合にフラグが表示されるスタンダードなCTFアプリ

![image](https://github.com/r1k0t3k1/note/assets/57973603/1da392dd-9e7d-4555-acef-6c36e59d6fcd)

![image](https://github.com/r1k0t3k1/note/assets/57973603/9923ab54-6587-4bca-bf20-7eca82ebc507)

`jadx-gui`でJavaソースコードを復元する。

![image](https://github.com/r1k0t3k1/note/assets/57973603/a1f569cf-e993-4b16-8a55-ce0ed58bea92)

MainActivityには以下の関数がある。

- check
- get_random
- onCreate

onCreateから実装を見ていく。

Buttonクリック時にTextViewから入力値を取得し、数値のみかどうか検証している。

入力値が数値のみだった場合、続いてcheck関数の第二引数に入力値が渡される。

check関数の第一引数は逐次生成した乱数が渡されている。

![image](https://github.com/r1k0t3k1/note/assets/57973603/84cb8d36-0da5-407d-a4bc-6e512b01e738)

check関数は(第一引数 * 2) + 4が第二引数だった場合にフラグを表示するメインの処理に入る。

![image](https://github.com/r1k0t3k1/note/assets/57973603/db221fe8-7320-430d-9796-2417e2c70d43)

そのためFridaで以下のようなjsを利用して入力値を事前に改ざんする。

具体的には第一引数(乱数)から(第一引数 * 2) + 4を事前に計算して第二引数に渡す。

```js
Java.perform(function() {
  var activity = Java.use("com.ad2001.frida0x1.MainActivity");
  activity.check.overload("int", "int").implementation = function(i1, i2) {
    console.log("called 'check()'");
    this.check(i1, (i1*2)+4);
  };
});
```

このスクリプトをFridaで注入しアプリで適当な入力を行いSubmitをクリックするとフラグが表示される。

```bash
frida -U -l hook.js -f com.ad2001.frida0x1
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/7293f0f8-c86e-449f-b948-50d644b62407)


![image](https://github.com/r1k0t3k1/note/assets/57973603/8f06ce62-dcd7-4fc7-96a9-1fdd5891e057)

