---
title: "TsukuCTF 2023\nWriteup"
id: "tsukuctf-2023"
description: "TsukuCTF 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-12-11"
isDraft: true
---

TsukuCTFに0nePaddingで参加してきました。

順位は13位でした。

![image](https://github.com/r1k0t3k1/note/assets/57973603/13d4c2c7-4400-406c-a57b-c91cef04a8ba)

# [rev] title_screen

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/951a22f0-a403-4fad-afb5-01c4a1ee4a2e)

NESのアセンブリソース一式とキャラクターのBMPファイルが渡されます。

main.asm

```asm
.setcpu		"6502"
.autoimport	on

PPU_ADDR1	=	$0001
PPU_ADDR2	=	$0002

PPU_STATUS	=	$2002

.segment "HEADER"
	.byte	$4E, $45, $53, $1A
	.byte	$02
	.byte	$01
	.byte	$01
	.byte	$00
	.byte	$00, $00, $00, $00
	.byte	$00, $00, $00, $00

.segment "STARTUP"
.proc	Reset
	sei
	ldx #$ff
	txs
	clc
	cld
	
	lda #$00
	sta $2000
	sta $2001
	sta $2005
	sta $2006
	
	lda $4015
	and #%11111110
	sta $4015

	lda PPU_STATUS
	lda #$00
	sta $2000
	sta $2001

	lda #$00
	ldx #$00

clear_memory:
	sta $0000, X
	sta $0100, X
	sta $0200, X
	sta $0300, X
	sta $0400, X
	sta $0500, X
	sta $0600, X
	sta $0700, X
	inx
	cpx #$00
	bne clear_memory

	lda #$20
	sta $2006
	lda #$00
	sta $2006
	lda #$00
	ldx #$00
	ldy #$04

clear_vram_loop:
	sta $2007
	inx
	bne clear_vram_loop
	dey
	bne clear_vram_loop

	lda	#$3F
	sta	$2006
	lda	#$00
	sta	$2006
	ldx	#$00
	ldy	#$10

setpal:
	lda	palettes, x
	sta	$2007
	inx
	dey
	bne	setpal
	
	lda	#$20
	sta	$2006
	lda	#$00
	sta	$2006

	ldy #0
	jsr set_row

	jmp mapping1

mapping1:
	ldy	#11
	ldx	#$00
	lda	#$8c
mapping1_y_loop:
	jsr set_row
	ldx #05
	jsr set_col
	ldx #$14
mapping1_x_loop:
	sta	$2007
	dex
	bne	mapping1_x_loop

	iny
	cpy #16
	bne mapping1_y_loop


mapping2:
	ldy	#13
	jsr set_row
	ldx #08
	jsr set_col
	ldx #00
	ldy #14
mapping2_x_loop:
	lda	data, x
	sta	$2007
	inx
	dey
	bne	mapping2_x_loop


screenend:
	lda	#$00
	sta	$2005
	sta	$2005

	lda	#$08
	sta	$2000
	lda	#$1e
	sta	$2001

loop:
	jmp	loop

set_row:
	pha

	tya
	lsr a
	lsr a
	lsr a
	clc
	adc #$20
	sta	PPU_ADDR1

	tya
	asl a
	asl a
	asl a
	asl a
	asl a
	sta	PPU_ADDR2

	lda	PPU_ADDR1
	sta	$2006
	lda	PPU_ADDR2
	sta	$2006

	pla
	rts

set_col:
	pha

	txa
	adc PPU_ADDR2
	sta	PPU_ADDR2

	lda	PPU_ADDR1
	sta	$2006
	lda	PPU_ADDR2
	sta	$2006

	pla
	rts

.endproc

palettes:
	.byte	$01, $18, $39, $30
	.byte	$0f, $06, $16, $26
	.byte	$0f, $08, $18, $28
	.byte	$0f, $0a, $1a, $2a

data:
	.byte	$22, $a4, $39, $26, $39
	.byte	$a4, $55, $79, $bb, $4c
	.byte	$39, $c7, $a4, $d1, $8c

.segment "VECINFO"
	.word	$0000
	.word	Reset
	.word	$0000

.segment "CHARS"
	.incbin "character.chr"
```

character.bmp

![image](https://github.com/r1k0t3k1/note/assets/57973603/9ffab608-4ade-4184-898d-403e93bdf739)

二通りの解法があるので記載します。

## 静的解析

以下サイト等を参考にNESの命令を調べているとI/Oポート`$2006`への書き込み(二回)でアクセス先VRAMアドレスを決定しI/Oポート`$2007`で書き込む、という命令になるらしいです。

http://hp.vector.co.jp/authors/VA042397/nes/index.html

ので`$2007`への書き込みに注目します。すると下記の部分で、事前に定義された`data[x]`を`$2007`に書き込むループ処理があります。

```asm
mapping2_x_loop:
	lda	data, x
	sta	$2007
	inx
	dey
	bne	mapping2_x_loop
```

`data`の定義は以下。

```asm
data:
	.byte	$22, $a4, $39, $26, $39
	.byte	$a4, $55, $79, $bb, $4c
	.byte	$39, $c7, $a4, $d1, $8c
```

`data[x]`が`character.bmp`に対するキャラクタ画像のインデックスになっているようで
`character.bmp`の左上を0とし順に見ていくと文字列が復元できました。

## ビルドしてエミュレーターで起動する方法

`cl65`コマンドで素直にビルドしようとすると`character.cfg`がないと怒られます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/42fdbac8-0211-4b87-891d-6f8e7329e334)

渡されたBMPファイルからchrファイルを生成するため、以下のツールを使用しました。

https://github.com/suzukiplan/bmp2chr

このツールは128x128のBMPしか変換できないようなので、PythonでBMPをサイズ変換します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/dd5ae2a9-11a0-4fff-b737-d10453690ed7)

```python
from PIL import Image
i = Image.open("./character.bmp")
i = i.crop((0,0,128,128))
i = i.quantize(8)
i.save("resized.bmp")
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/d46fe80e-542c-42ee-9f9a-55c4193d4163)

![image](https://github.com/r1k0t3k1/note/assets/57973603/22832ab9-cae2-496a-a905-2e7cfb5b8a11)

![image](https://github.com/r1k0t3k1/note/assets/57973603/81e064dd-5811-47ba-a318-652fa5705405)


BMPからCHRへの変換が成功します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7efd6044-dbf9-41fd-8b8d-e131ea7c3670)

CHRが生成できたのでアセンブリをビルドしてみるとビルドに成功したのがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/569d1729-bb1f-4dea-8974-156073fb00a1)

Webで公開されているエミュレータを使用するとタイトル画面？が表示されフラグが表示されます。

https://jsnes.org/

![image](https://github.com/r1k0t3k1/note/assets/57973603/9ff55fcf-9c1f-4ae9-bb99-cbc49e68d514)

