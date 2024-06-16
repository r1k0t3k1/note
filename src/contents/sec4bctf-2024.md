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

![image](https://github.com/r1k0t3k1/note/assets/57973603/a16e5e90-a210-49cb-81e7-cc0d88ec5dfa)

```bash
curl -i -X 'POST' https://getrank.beginners.seccon.games/ \
-H 'Content-Type: application/json' \
--data-binary '{"input":"0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"}'
```

```
ctf4b{15_my_5c0r3_700000_b1g?}
```

## clamre

# web
## wooorker
## ssrforlfi
## wooorker2
## flagAlias
