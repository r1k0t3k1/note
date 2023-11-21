---
title: "API Hashingを実装して理解する"
id: "api-hashing"
description: "API Hashingの技術について学びました。"
author: "rikoteki"
createdAt: "2023-11-12"
isDraft: true
---

# API Hashingとは
# API Hashingを実装する

# LoadLibraryのロードを隠蔽する

# TEBのアドレス特定

```
windbg> !teb
PEBAddressを確認
windbg>　dt _TEB {TEB Address}
```
![image](https://github.com/r1k0t3k1/note/assets/57973603/38dae896-1edf-4c31-a836-6d565d0d8b26)

![image](https://github.com/r1k0t3k1/note/assets/57973603/81a478cd-1fa9-4b6a-952d-4d1dfa1a64d3)


# PEBのアドレス特定

```
windbg>　dt _PEB {PEB Address}
```
![image](https://github.com/r1k0t3k1/note/assets/57973603/99c18381-0bc5-417b-a565-b75cbf903d46)


# _PEB_LDR_DATAのアドレス特定

```
windbg> dt _PEB_LDR_DATA 0x00007ffd`8765b4c0
```
![image](https://github.com/r1k0t3k1/note/assets/57973603/11e14b6e-49ae-4023-81ab-456d0d0722b6)


# _LDR_DATA_TABLE_ENTRYからKernel32.dllのアドレスを特定

![image](https://github.com/r1k0t3k1/note/assets/57973603/85c425d8-9d35-4d7d-ad17-b53bc869d0aa)
![image](https://github.com/r1k0t3k1/note/assets/57973603/1ff96615-fa10-4657-85b5-4fea617a16be)

FLinkを一つたどる
![image](https://github.com/r1k0t3k1/note/assets/57973603/096340bc-9574-4b48-bc12-ef69338f6cd5)

FLinkをもう一つたどる
![image](https://github.com/r1k0t3k1/note/assets/57973603/2c1b4a66-639a-4387-bf19-9267bc867062)


# e_lfanewから_IMAGE_NT_HEADERSのアドレスを特定

![image](https://github.com/r1k0t3k1/note/assets/57973603/d9434fcf-4b17-4c3e-8a7b-78d61ca61874)

# _IMAGE_OPTIONAL_HEADERから_IMAGE_DATA_DIRECTORYのIMAGE_DIRECTORY_ENTRY_EXPORTのアドレスを特定

![image](https://github.com/r1k0t3k1/note/assets/57973603/21e67889-92a8-45d4-a16d-d751d5b21f60)

![image](https://github.com/r1k0t3k1/note/assets/57973603/5d6dd6b8-e695-4c0b-89c8-fd4e4c598599)

 # IMAGE_DIRECTORY_ENTRY_EXPORTの特定
 
![image](https://github.com/r1k0t3k1/note/assets/57973603/e792d413-7932-4c97-ac88-56b8629743d5)

