---
title: "picoCTF Gym\nBit-O-Asm-1"
id: "picoctf-gym-bit-o-asm-1"
description: "picoCTF Gym Bit-O-Asm-1のWriteupです。"
author: "rikoteki"
createdAt: "2023-09-26"
---

# 問題

アセンブリが記述されたファイルが渡され最終的にEAXレジスタに入っている値を答える問題

![image](https://github.com/r1k0t3k1/note/assets/57973603/54d4ee27-16e9-4741-8ea3-7ac8192542da)

# 解析

アセンブリファイルを見るとoffset +15の箇所でEAXに0x30が格納されているので10進数に直しフラグのフォーマットに合わせて提出する。

`picoCTF{48}`

![image](https://github.com/r1k0t3k1/note/assets/57973603/57cdef5f-79da-43c5-9881-afd8538c6aa3)



