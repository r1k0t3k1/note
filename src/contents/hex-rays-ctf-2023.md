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

check_input関数では入力値とスタックに保存されたバイト列のXORを取った結果がまた別のスタックに保存されたバイト列と一致するかを検証しています。

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

そのため、スタックのバイト列同士でXORを取るスクリプトを書けば期待する入力値が復元できます。

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

![image](https://github.com/r1k0t3k1/note/assets/57973603/972dbad5-aa50-4f57-a89b-f13c94a07c68)


### Page3

Page3は入力が`Search the book for clues`であるかを検証しているだけでした。

```c
bool check_input(char *param_1)

{
  uint local_c;
  
  local_c = (uint)(*param_1 == 'S');
  if (param_1[1] == 'e') {
    local_c = local_c + 1;
  }
  if (param_1[2] == 'a') {
    local_c = local_c + 1;
  }
  if (param_1[3] == 'r') {
    local_c = local_c + 1;
  }
  if (param_1[4] == 'c') {
    local_c = local_c + 1;
  }
  if (param_1[5] == 'h') {
    local_c = local_c + 1;
  }
  if (param_1[6] == ' ') {
    local_c = local_c + 1;
  }
  if (param_1[7] == 't') {
    local_c = local_c + 1;
  }
  if (param_1[8] == 'h') {
    local_c = local_c + 1;
  }
  if (param_1[9] == 'e') {
    local_c = local_c + 1;
  }
  if (param_1[10] == ' ') {
    local_c = local_c + 1;
  }
  if (param_1[0xb] == 'b') {
    local_c = local_c + 1;
  }
  if (param_1[0xc] == 'o') {
    local_c = local_c + 1;
  }
  if (param_1[0xd] == 'o') {
    local_c = local_c + 1;
  }
  if (param_1[0xe] == 'k') {
    local_c = local_c + 1;
  }
  if (param_1[0xf] == ' ') {
    local_c = local_c + 1;
  }
  if (param_1[0x10] == 'f') {
    local_c = local_c + 1;
  }
  if (param_1[0x11] == 'o') {
    local_c = local_c + 1;
  }
  if (param_1[0x12] == 'r') {
    local_c = local_c + 1;
  }
  if (param_1[0x13] == ' ') {
    local_c = local_c + 1;
  }
  if (param_1[0x14] == 'c') {
    local_c = local_c + 1;
  }
  if (param_1[0x15] == 'l') {
    local_c = local_c + 1;
  }
  if (param_1[0x16] == 'u') {
    local_c = local_c + 1;
  }
  if (param_1[0x17] == 'e') {
    local_c = local_c + 1;
  }
  if (param_1[0x18] == 's') {
    local_c = local_c + 1;
  }
  if (param_1[0x19] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1a] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1b] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1c] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1d] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1e] == '\0') {
    local_c = local_c + 1;
  }
  if (param_1[0x1f] == '\0') {
    local_c = local_c + 1;
  }
  return local_c == 0x20;
}

```

### Page4

Page4では0x004056a0からのバイト列を、0x408184からのバイト列をKeyとしてAES復号した結果と入力値を比較しています。

```c
bool check_input(char *param_1)

{
  int iVar1;
  size_t __n;
  long lVar2;
  undefined8 *puVar3;
  undefined8 *puVar4;
  byte bVar5;
  undefined4 userKey;
  undefined4 uStack_744;
  undefined4 uStack_740;
  undefined4 uStack_73c;
  undefined4 local_738;
  undefined4 uStack_734;
  undefined4 uStack_730;
  undefined4 uStack_72c;
  AES_KEY key;
  undefined8 local_628 [192];
  
  bVar5 = 0;
  puVar3 = &DAT_004056a0;
  puVar4 = local_628;
  for (lVar2 = 0xc0; lVar2 != 0; lVar2 = lVar2 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + 1;
    puVar4 = puVar4 + 1;
  }
  userKey = _DAT_00408180;
  uStack_744 = uRam0000000000408184;
  uStack_740 = uRam0000000000408188;
  uStack_73c = uRam000000000040818c;
  local_738 = _DAT_00408190;
  uStack_734 = uRam0000000000408194;
  uStack_730 = uRam0000000000408198;
  uStack_72c = uRam000000000040819c;
  AES_set_decrypt_key((uchar *)&userKey,0x100,&key);
  puVar3 = local_628;
  do {
    puVar4 = puVar3 + 2;
    AES_decrypt((uchar *)puVar3,(uchar *)puVar3,&key);
    puVar3 = puVar4;
  } while ((undefined8 *)&stack0xffffffffffffffd8 != puVar4);
  puVar3 = local_628;
  puVar4 = &DAT_004056a0;
  for (lVar2 = 0xc0; lVar2 != 0; lVar2 = lVar2 + -1) {
    *puVar4 = *puVar3;
    puVar3 = puVar3 + (ulong)bVar5 * -2 + 1;
    puVar4 = puVar4 + (ulong)bVar5 * -2 + 1;
  }
  __n = strlen(param_1);
  iVar1 = strncmp(param_1,(char *)&DAT_004056a0,__n);
  return iVar1 == 0;
}
```

Keyはプログラム開始時は0埋めされているため、frida-traceを使用して`AES_set_decrypt_key`に渡されるuserKeyに格納されている値を確認しました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/52b0553c-b8d8-4220-85c7-1a46a96c0c3a)

Page4まで正しい入力値を入力し、Page4で適当な入力を行うと、KeyはPage3で入力した文字列ということがわかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/18fee810-7f7b-4870-b40d-f9513ff597fa)

ということでスクリプトを書いて復号します。

```python
from Crypto.Cipher import AES

b = b'\x42\xbc\x23\x27\x0f\xf2\x36\x8c\x92\x17\xd9\xef\x20\xae\xde\x57\x5d\x8e\xa4\x05\xfd\x0c\xce\x09\xea\x88\x43\xfe\x93\x3a\x99\x02\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20\x8b\x76\x4f\x6b\x5c\xaf\x03\x02\xfa\x61\xaf\xfd\xb2\x04\x02\x20'

key = b"Search the book for clues" + b"\x00" * 7

aes = AES.new(key, AES.MODE_ECB)
plain = aes.decrypt(b)
print(plain)
```

実行すると正しい入力値が得られました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/f8440693-7120-4576-add5-230b0f754b85)


### Secret Page
