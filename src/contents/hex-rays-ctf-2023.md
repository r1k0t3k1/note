---
title: "Madame De Maintenon’s \nCryptographic Pursuit –\nUnmasking the Traitors"
id: "hex-rays-ctf-2023"
description: "hex-rays challenge 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-11-30"
isDraft: false
---

## 概要

2023/11/8から2023/11/30に渡って開催されたhex-rays社主催のリバーシングチャレンジです。

https://hex-rays.com/blog/madame-de-maintenons-cryptographic-pursuit-unmasking-the-traitors/

正答者には抽選でIDA Pro、Tシャツ、キャップが当たります。

(IDA Proほしい！)

## 解析

一つのELFバイナリが渡されますのでGhidraで解析していきます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/02028589-e886-4683-96b3-21e69abf5cf7)

mainと思われる関数には５つの関数がありました。便宜上、これらをpage_1~4,secret_pageとRenameしました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/e4de90e7-217a-4f85-9d8a-14d43ec12b24)

これらの関数を順に解析していきます。

### Page1

結果から言うと、標準入力から読み取った値が`Head to the library`であればメモリ上のデータをAESで復号して表示し、次の処理に進むという関数でした。

標準入力との比較処理の部分を抜粋します。
1byteずつ標準入力と`Head to the library`が一致するか確認していることがわかります。

```c
    lVar3 = 0x13;
    pbVar5 = (byte *)"Head to the library";
    ptr_user_input = (uint *)user_input;
    do {
      if (lVar3 == 0) break;
      lVar3 = lVar3 + -1;
      bVar7 = *pbVar5 < *(byte *)ptr_user_input;
      bVar8 = *pbVar5 == *(byte *)ptr_user_input;
      pbVar5 = pbVar5 + (ulong)zero * -2 + 1;
      ptr_user_input = (uint *)((long)ptr_user_input + (ulong)zero * -2 + 1);
    } while (bVar8);
    if ((!bVar7 && !bVar8) == bVar7) {
    // AES復号処理
    }
```
バイナリを実行し標準入力に`Head to the library`を入力すると次の文字列が出力され、再度標準入力が求められます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/1843b2fa-4122-4249-a1a0-131d487c6295)

### Page2

Page2でも同様に標準入力から200byte読み込んでいます。

今回はその文字列をcheck_input関数(Renamed)で検証しています。

```c
  read_200chr_from_stdin(user_input[0]);
  iVar1 = check_input(user_input[0]);
  if (iVar1 != 0) {
  // AES復号処理
  }
```

check_input関数では以下のようにスタックに格納したバイト列と入力をXORし、その結果がまた別のスタックに格納したバイト列と一致するか確認しています。

```c
undefined8 check_input(char *param_1)

{
  byte *ptr_param_1_first_0x100;
  byte *pbVar1;
  long lVar2;
  size_t param_1_len;
  byte bVar3;
  byte *pbVar4;
  undefined4 local_148;
  undefined4 uStack_144;
  undefined4 uStack_140;
  undefined4 uStack_13c;
  undefined8 local_138;
  undefined4 local_130;
  undefined local_12c;
  undefined4 local_128;
  undefined4 uStack_124;
  undefined4 uStack_120;
  undefined4 uStack_11c;
  undefined4 local_118;
  undefined4 uStack_114;
  undefined4 uStack_110;
  undefined4 uStack_10c;
  char param_1_first_0x100 [29];
  byte local_eb [227];
  
  local_138 = 0xed3bf4e402f3b0cf;
  local_128 = 0xc8633644;
  uStack_124 = 0xa084281c;
  uStack_120 = 0x392f3a8d;
  uStack_11c = 0x4f92eef7;
  local_130 = 0x90ec7f44;
  local_118 = 0x6cd3d5a7;
  uStack_114 = 0xcd4f8c81;
  uStack_110 = 0xfc891737;
  uStack_10c = 0x1bc21cf9;
  local_12c = 0x9f;
  local_148 = 0xab065e07;
  uStack_144 = 0xcfe60877;
  uStack_140 = 0x195c51e2;
  uStack_13c = 0x3bb28098;
  ptr_param_1_first_0x100 = (byte *)strncpy(param_1_first_0x100,param_1,0x100);
  pbVar4 = (byte *)((long)&local_128 + 1);
  bVar3 = 0x44;
  pbVar1 = ptr_param_1_first_0x100;
  while( true ) {
    *pbVar1 = *pbVar1 ^ bVar3;
    pbVar1 = pbVar1 + 1;
    if (pbVar1 == local_eb) break;
    bVar3 = *pbVar4;
    pbVar4 = pbVar4 + 1;
  }
  bVar3 = 7;
  lVar2 = 0;
  do {
    if (ptr_param_1_first_0x100[lVar2] != bVar3) {
LAB_00402630:
                    /* WARNING: Subroutine does not return */
      simple_puts("You were unable to locate the next page of the diary");
    }
    if (lVar2 + 1 == 0x1d) {
      param_1_len = strlen(param_1);
      if (param_1_len < 0x1e) {
        return 1;
      }
      goto LAB_00402630;
    }
    bVar3 = *(byte *)((long)&local_148 + lVar2 + 1);
    lVar2 = lVar2 + 1;
  } while( true );
}
```
そのためスタックに格納されているバイト列同士でXORを取ると以下のように入力値として期待する文字列が復元できます。

```python
from Crypto.Util.number import *

key = [
    0xc8633644,
    0xa084281c,
    0x392f3a8d,
    0x4f92eef7,
    0x6cd3d5a7,
    0xcd4f8c81,
    0xfc891737,
    0x1bc21cf9,
]

enc = [
    0xab065e07,
    0xcfe60877,
    0x195c51e2,
    0x3bb28098,
    0xed3bf4e402f3b0cf,
    0x90ec7f44,
    0x9f
]
key = b"".join([long_to_bytes(i)[::-1] for i in key])
enc = b"".join([long_to_bytes(i)[::-1] for i in enc])

for i,b in enumerate(enc):
    p = key[i] ^ b
    print(chr(p), end="")
```
page2
![image](https://github.com/r1k0t3k1/note/assets/57973603/972dbad5-aa50-4f57-a89b-f13c94a07c68)


### Page3
### Page4
### Secret Page
