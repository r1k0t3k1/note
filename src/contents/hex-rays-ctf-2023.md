---
title: "Madame De Maintenon’s \nCryptographic Pursuit –\nUnmasking the Traitors"
id: "hex-rays-ctf-2023"
description: "hex-rays challenge 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-12-5"
isDraft: false
---

## 概要

2023/11/8から2023/11/30に渡って開催されたhex-rays社主催のリバーシングチャレンジです。

https://hex-rays.com/blog/madame-de-maintenons-cryptographic-pursuit-unmasking-the-traitors/

正答者には抽選でIDA Pro、Tシャツ、キャップが当たります。

(IDA Proほしい！)※外れた

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

Page4で正しい入力値が判明しましたがこれを入力しても真相にはたどり着けないようです。

最後のPageの実装を確認します。

最後のページでは0x408480,0x408484,0x408488がいずれも0以外の場合のみ処理が実行されるようです。

```c
undefined8 secret_page(void)

{
  char *userKey;
  char acStack_28 [40];
  
  if (((DAT_00408488 != 0) && (DAT_00408484 != 0)) && (DAT_00408480 != 0)) {
    userKey = strncpy(acStack_28,&DAT_0040838a,0x20);
    aes_decrypt(userKey,&DAT_004050a0);
    return 1;
  }
  return 1;
}
```

この３つのフラグに書き込みを行う箇所を探すと、RSA暗号化を行う関数がヒットします。

```c
void rsa_encrypt(void)

{
  int iVar1;
  RSA *rsa;
  BIGNUM *local_128;
  BIGNUM *local_120;
  undefined local_118 [16];
  undefined local_108 [16];
  undefined local_f8 [16];
  undefined local_e8 [16];
  undefined local_d8 [16];
  undefined local_c8 [16];
  undefined local_b8 [16];
  undefined local_a8 [16];
  undefined local_98 [16];
  undefined local_88 [16];
  undefined local_78 [16];
  undefined local_68 [16];
  undefined local_58 [16];
  undefined local_48 [16];
  undefined local_38 [16];
  undefined local_28 [16];
  
  local_128 = (BIGNUM *)0x0;
  local_120 = (BIGNUM *)0x0;
  rsa = RSA_new();
  local_118 = (undefined  [16])0x0;
  local_108 = (undefined  [16])0x0;
  local_f8 = (undefined  [16])0x0;
  local_e8 = (undefined  [16])0x0;
  local_d8 = (undefined  [16])0x0;
  local_c8 = (undefined  [16])0x0;
  local_b8 = (undefined  [16])0x0;
  local_a8 = (undefined  [16])0x0;
  local_98 = (undefined  [16])0x0;
  local_88 = (undefined  [16])0x0;
  local_78 = (undefined  [16])0x0;
  local_68 = (undefined  [16])0x0;
  local_58 = (undefined  [16])0x0;
  local_48 = (undefined  [16])0x0;
  local_38 = (undefined  [16])0x0;
  local_28 = (undefined  [16])0x0;
  BN_hex2bn(&local_128,s_8e449627141446d50a3bfab5d9fc0d58_004077a0);
  BN_hex2bn(&local_120,"3");
  RSA_set0_key(rsa,local_128,local_120,0);
  RSA_public_encrypt(0x100,&DAT_00408380,local_118,rsa,3);
  iVar1 = memcmp(local_118,&DAT_004076a0,0x100);
  if (iVar1 == 0) {
    if (DAT_00408488 == 0) {
      DAT_00408488 = 1;
      return;
    }
    if (DAT_00408484 == 0) {
      DAT_00408484 = 1;
      return;
    }
    DAT_00408480 = 1;
  }
  return;
}
```

この関数は以下の条件で暗号化を行っているようでした。

```python
n = 0x4077a0から開始するバイト列
m = 0x408380から開始するバイト列
e = 3
c = 0x4076a0から開始するバイト列
```

このうちmはPage1の入力値`Head to the library`が格納されるアドレスです。

ですが、この文字列を暗号化した結果が0x4076a0とは一致しないため最後のPageの処理が行われません。

Page1の実装を見返すと、期待する入力値(`Head to the library`)よりはるかに大きいバイト列をコピーしていることがわかります。

```c
    if ((!bVar7 && !bVar8) == bVar7) {
      strncpy(&DAT_00408380,user_input,200);
```

そのためPage1で期待する文字列はもっと長いのではないか？と仮設が立ちます。

0x4076a0から始まるバイト列が解読できれば最後の関数の処理を実行させる条件を達成できると考えました。

暗号にはあまり明るくないのでとりあえず`e = 3`ということでLow Public Exponent Attackを試しましたが解読には至らず…

しばらく実装を見ていると、プログラム中にnとcを複数回書き換える処理が存在することに気づきました。

nを書き換える処理はユーザーからの標準入力を受け取る関数に実装されていました。

```c
void read_200chr_from_stdin(long param_1)

{
  char input_chr;
  long lVar1;
  undefined8 *puVar2;
  undefined8 *puVar3;
  
  if (DAT_00408488 != 0) {
    puVar2 = &DAT_00406ea0;
    puVar3 = (undefined8 *)s_8e449627141446d50a3bfab5d9fc0d58_004077a0;
    for (lVar1 = 0x40; lVar1 != 0; lVar1 = lVar1 + -1) {
      *puVar3 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar3 = puVar3 + 1;
    }
  }
  if (DAT_00408484 != 0) {
    puVar2 = &DAT_004065a0;
    puVar3 = (undefined8 *)s_8e449627141446d50a3bfab5d9fc0d58_004077a0;
    for (lVar1 = 0x40; lVar1 != 0; lVar1 = lVar1 + -1) {
      *puVar3 = *puVar2;
      puVar2 = puVar2 + 1;
      puVar3 = puVar3 + 1;
    }
  }
  lVar1 = 0;
  do {
    input_chr = simple_getc(stdin);
    if ((input_chr == '\n') || (input_chr == '\0')) {
      *(undefined *)(param_1 + (int)lVar1) = 0;
      return;
    }
    if (0x5e < (byte)(input_chr - 0x20U)) {
                    /* WARNING: Subroutine does not return */
      simple_puts(
                 "The other patrons of the library are alarmed by the weird noises you\'re making?!! ?"
                 );
    }
    *(char *)(param_1 + lVar1) = input_chr;
    lVar1 = lVar1 + 1;
  } while (lVar1 != 199);
  return;
}
```

また、cはPage2,3内で書き換えられていました。

つまり、nとcは`初期値、書換1、書換2`と3パターンあることがわかります。

この状態について調べていると`同じ平文Mを異なるN、同じeを使って暗号化された文がe個ある`場合に`Hastad Broadcast Attack`という攻撃が有効であるということがわかりました。

https://www.ochappa.net/posts/rsa-hba

ということでスクリプトを適当に拾ってきて実行すると解読に成功しました。

```python
from Crypto.Util.number import long_to_bytes
from Crypto.Util.number import bytes_to_long
from gmpy2 import iroot
from gmpy2 import invert


def mul(lst):
    ret = 1
    for n in lst:
        ret *= n
    return ret

def crt(C, N):
    assert len(C) == len(N)

    total = 0
    modulo = mul(N)

    for n_i, c_i in zip(N, C):
        p = modulo // n_i
        total += c_i * invert(p, n_i) * p
    return total % modulo

def third_root(n):
    m, valid = iroot(n, e)
    if valid:
        print("Cleartext :", long_to_bytes(m))
    else:
        print("Unable to find the third root of :", n)

e = 3
n1 = 0x8e449627141446d50a3bfab5d9fc0d58c6b9f64630d011cb5c831c5989402de1f553ae70c9f8ddefb42f001e553fe7d852bb08cec6efebe490eb40c91955b020159c66836a5d7d5364da7cab32deff4ea6ec1e41bdda7b7c298da68d4be77e4750bf86d5d24ed67511bb37a105bc4da0e3ec0cd4960a1ae2986fd402101061d290f292030bcf21a38d77dbde760d01a3faaa210e34a4e471fa0eac5518d2f01faa70659f582a9e211ff6b438b0bb1abb49f4bb458acefd7bbcc8f68ed7cd121bf16ad1d5e0cd5384b4e3441de7d5ec3c10c52ed9263ffe3c6af5ba508f0b774e932dece2f84c053f972ca31a68c1cd13668db6adb3e2320c93a0b06ae1737ad9
n2 = 0x678dcc64ccf7c29ffe64838a80196bd90b2d6247e4d712cb60c6a4a3a09ac088b9d1b19518451ce1a295ca6134a65cb5176083849e11cea23cf5d6c303ee95d02f1af26f741131d03c4e86866e26b09069c0be5c718298ed1cfc01493d78520957e25c2d921f6b6518ef5ef608e209d4d9ad613fdb6a2eb4156c906c89583949ca076312c6a258f14794ee852a61f27fe2a6b17b1ea85de3e40a2636fc4430e920ed8dc688aebdb6f5e63140f7844f3597c82704545c308a36e20eb94e00b35eaee860835c2f213956bfb79bb17d9b914524a5b133be5af4667ca0710420ca6bd90c28761ba1d52ed7d83d927245f53d45b35f2f1729ff602271abb0ebf7ce5b
n3 = 0xb1b751bdef5727862c0f6bddcaa9802722b2499c760e02d7bb4c38629339194431dbeb41a6222e01dca0fa8e792562ccc9bcf9c57549037a44eb4945daf4440ac4f4aab3bdf1566a3961c88e8cdb925870e68e9064354568335eefc62344fdac06593bdd8c4dc63c0af932f5dab986919f4acb4b602896ba1896c3d0bc00a9bd6408a85e3e8766bfd44af0ab151d3537c2b2955eebe9cbcd6871146524253e14e374cdda166e8b298932695c774ab8f8ac332a92fa49c91f65ce1a01b12e3d056990c954a3c6fa9346a67819bbc76d9cfbebff9810841810ccfdd3a3773cc24ead32665b8e667b1b0b817f0bb3d8d7ca17342e6b2d024762e2ecbf897af9cb15

c1 = bytes_to_long(b'\x7d\x9e\x6b\x09\x32\x18\x08\x0a\x5a\x34\x34\x9c\x0d\xb3\xc3\xc9\x86\xb1\x02\xd9\x8c\x14\xcd\xa7\x0b\xb2\x41\xb5\xa8\x38\x39\x4c\xab\xb1\x32\xd9\x78\x9d\xea\xde\x34\xca\x28\xa3\x96\x7b\x77\xe1\xda\x56\xc4\x28\xf4\x0c\x7d\x60\x1b\xe4\xae\x2c\xb9\x8f\xee\x1b\x8c\x8d\xcb\x22\xee\xed\xfc\x4b\xb6\x46\x2a\x9c\x24\xd4\xfd\x45\x85\x4d\x5d\xc0\x4f\x58\xe5\xbc\x70\x1b\x6c\xac\x9e\xd6\xd0\x2b\xa0\x5b\x89\x35\xc7\xfe\x26\xf8\x40\x86\xcd\x49\xd0\xd6\x6b\xcb\x65\x75\xaa\xa7\x91\xf8\x1b\xe8\x47\x68\xb5\x96\x1f\x3f\xf1\x05\xee\x5e\xc5\x6f\xcd\xaf\x46\xa1\xc7\x36\x9d\xd4\xd5\x8e\xcd\x2c\xe2\x8c\x7a\xbb\x0f\x35\xe0\xdc\x07\x52\xa1\x1b\x89\x16\x96\x9a\xf4\x91\xf6\xba\xaf\xbf\xfe\x08\x77\xfa\xe0\x5b\xa1\x8d\x6d\xaf\x38\x5b\xcc\xd8\x89\x51\xd7\x2e\x6b\x8a\x4c\xcc\xa0\x0f\xa3\xbf\x45\x1f\x51\x2e\xae\xbf\x8a\x20\xba\xad\x68\xe0\x4c\xaa\xe6\x8b\x8f\xa1\xdb\xcb\xd1\xae\x37\x7b\x5c\xf2\x6a\x7c\x90\xb6\x34\x85\x69\x03\x6d\x76\xd8\x38\xb5\xbc\xd0\xe6\xc4\x23\x58\x12\x65\xed\xcc\xf3\x22\x79\xa0\xb6\x29\xfa\xb0\xfc\xd4\x85\xa3\x8b\x42\x05')
c2 = bytes_to_long(b'\x67\x51\x2e\x54\xff\x9c\xd8\x53\xab\x64\x5a\x69\xec\x8f\x64\x00\x9f\xad\x60\xee\xe8\x4c\xe5\xd9\xa5\xdb\x87\x54\x81\x3d\x5f\x9c\x9c\x03\x8d\xa9\x47\x6c\xaf\x9f\x1b\x54\x3a\x28\x96\x13\xd0\x2a\x4a\xdd\xc2\x94\x8b\x94\xa9\x65\xb2\xdc\xe0\xcb\x93\xb7\x71\x23\x6a\x7f\x1c\xf8\x79\xc8\x6c\x4f\x9c\x07\xf2\x6b\xbb\xd7\x73\xa7\xd9\xed\xf6\xb3\x98\x1e\x4f\x96\xf3\x55\xec\xdd\x74\x07\x50\x66\x72\xe5\x02\x5e\xc2\xc9\x15\xca\x1d\x5f\x35\xd1\xcc\xc3\x56\x79\xaf\xf9\x1b\x83\x3a\x07\xfc\x6b\xfa\xd0\x6c\x9a\xcf\x05\x38\x70\xe5\xf5\x2d\x3d\xc8\xf1\x75\x73\x55\xea\x4c\x8d\xa8\x1d\x88\xc3\x7d\x4b\x68\xeb\xe5\x02\x74\x56\x6c\xb6\x83\xc1\x9c\xf5\xfa\x6d\x88\x51\xf9\x2d\x9f\x9a\xbd\x5f\xd0\xcb\xb6\x75\x51\xc3\xfa\x20\x18\x55\x5b\x9a\x29\x95\xda\x96\x44\x3d\x97\x46\x39\x9f\xbb\x86\xac\xa1\x21\xfe\x4e\xbe\x97\xd8\x46\x8d\xb2\x2a\x0b\xd0\x87\xa1\xe3\xfc\x28\x9c\x56\x33\x15\x7b\xdc\x0b\xcd\x67\x7f\xaa\x26\xb1\xfa\x4b\xe8\x42\x85\xa4\x08\xed\xd2\x8e\x48\xab\x47\x53\x54\x65\xdc\xe2\x81\x11\x1b\x0b\x70\x85\x5c\xae\x18\x8a\xa6\xfd\xaa\x85')
c3 = bytes_to_long(b'\x1b\x48\xf3\xde\x27\xdb\x0a\x80\xff\xa2\x91\xb1\x61\xff\xe9\xca\x6c\xee\x79\xdb\x55\x9c\x80\x47\x57\x99\x20\xcb\x23\xc1\x30\x31\x1a\x36\x6f\x85\x61\xee\x59\x66\xee\x0a\x72\x29\x36\x71\xc3\x58\x70\x74\x01\x17\x59\xde\x78\xb8\x37\xb6\x76\x30\x3c\x01\x79\xdb\x6c\xfc\x6e\x5d\x88\x38\x35\x73\x82\x49\xbc\x61\xf8\xeb\xc6\xa6\xca\xde\x87\x7e\xee\x27\xf2\xf7\x4c\x51\x0f\x9a\xc6\xc7\x23\xe5\x3f\x76\xa8\xd4\x5d\xb5\xd6\x91\x8c\xee\x53\x0d\xb1\xa2\x10\x27\x81\xa4\x81\xcd\x09\x30\x87\x5b\x5f\x40\xc6\x1a\x35\xe6\x85\x36\x4c\x5e\xc8\x83\xbf\x58\x99\x23\x8e\xdd\xc2\x2b\xa1\x2c\xb5\x8f\xce\xe4\x9e\x94\x3c\x58\xb1\x3f\x5c\xd8\x93\xff\x4c\x02\xcd\xb5\x83\xea\x33\x59\xcd\x26\xb8\x36\x0a\x18\x73\x49\x8b\x4d\x65\x0c\x58\x0e\x5f\x2e\xa3\x1f\x24\x72\xa7\xf8\xd9\xa5\xee\x30\x23\x7c\x4a\xdd\xc4\x87\x69\x61\xab\x80\xf2\x92\x3e\x80\x7d\xbc\x31\x9d\x7e\x4a\xae\xc4\xc6\x3e\x14\x02\xf6\x8d\x9d\x11\xff\x03\x65\xa7\x03\x28\xe6\x2a\xa5\xda\x8f\x1d\x1b\x62\x03\x53\x81\xb1\xa0\x57\x44\xe7\x8a\xb0\x6d\x1d\x69\xbf\xd4\x5e\xb4\x1e\x4e\x90\x23\x38')

C = [c1, c2, c3]
N = [n1, n2, n3]

x = crt(C, N)
third_root(x)
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/e6dff693-8a68-4da7-b50a-48f314a2e824)

この出力をPage1に入力してPageを進めていくと異なる出力が得られます。

```
As you move to leave, the librarian comes running!

'I found this in the back room for you, it was a page we found lying around after procesing the most recent batch of new books but we weren't sure what it was for! But look at the signature!'

She hands you a fifth, almost completely blank new page. The aging of the paper looks near identical to the other four pages you found from the diary!

All the page says on it is:
_______________

The other key:

01000000110111000011011000000000

M d. M
_______________

You thank the librarian, and take your leave. You have much to think on. All these 1's and 0's, how do they encode the location of the final target???

#########################

Congratulations! If you've found all 5 pages of the diary you have everything you need! Convert the values you found into coordinates, (hint: IEEE-754 Floating Point), and send those coordinates in an email to marketing@hex-rays.com!
To locally verify your coordinates, the md5 of the coordinates, with 4 decimal places, (including potential leading zeros) in the form:
xx.xxxx, yy.yyyy
Has an md5 of fe72f3730186f24d983a1c2ed1bc1da7 when pasted as a 16 character string into https://www.md5hashgenerator.com/
```

座標の一部である二進数が表示され、フラグの提出方法が出力されています。

Page1~4で出力されていた二進数と合わせてフラグを算出するスクリプトを書き、md5ハッシュが一致することを確認すればOKです。

`45.9238, 06.8815`

```python
import hashlib
import struct
import math

bin1 = "0b01000010001101111011001000000101"
bin2 = "0b01000000110111000011011000000000"

f1 = struct.unpack('!f',struct.pack('!I', int(bin1, 2)))[0]
f2 = struct.unpack('!f',struct.pack('!I', int(bin2, 2)))[0]

coordinate = f"{math.floor(f1 * 10 ** 4) / (10 ** 4):07}, {math.floor(f2 * 10 ** 4) / (10 ** 4):07}"
assert hashlib.md5(coordinate.encode()).hexdigest() == "fe72f3730186f24d983a1c2ed1bc1da7", "wrong md5 hash"

print(coordinate)
```




