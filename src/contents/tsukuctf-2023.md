---
title: "TsukuCTF 2023\nWriteup"
id: "tsukuctf-2023"
description: "TsukuCTF 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-12-11"
isDraft: false
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

以下サイト等を参考にNESの命令を調べているとI/Oポート`$2006`への書き込み(二回)でアクセス先VRAMアドレスを決定しI/Oポート`$2007`で書き込む、という命令になるらしいです。`$2006`に`2000`が書き込まれていますが、これはネームテーブル0に対応しておりネームテーブルへの書き込みでどのブロック位置にどのキャラクタが埋め込まれるかが決定されるようです。

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

![image](https://github.com/r1k0t3k1/note/assets/57973603/22832ab9-cae2-496a-a905-2e7cfb5b8a11)

この状態で変換ツールを実行するとBMPからCHRへの変換が成功します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7efd6044-dbf9-41fd-8b8d-e131ea7c3670)

CHRが生成できたのでアセンブリをビルドしてみるとビルドに成功したのがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/569d1729-bb1f-4dea-8974-156073fb00a1)

Webで公開されているエミュレータを使用するとタイトル画面？が表示されフラグが表示されます。

https://jsnes.org/

![image](https://github.com/r1k0t3k1/note/assets/57973603/9ff55fcf-9c1f-4ae9-bb99-cbc49e68d514)

# [Web] basic

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/ea3828fb-49f2-43f5-9010-7109690cfe64)

pcapファイルが渡されます。

問題名から問題文で触れられているパスワードはBASIC認証のことでしょう。

WiresharkでフィルターをかけることでBASIC認証情報が見つかります。

`http.request and http contains "Authorization: Basic"`

![image](https://github.com/r1k0t3k1/note/assets/57973603/5920f87f-90d0-4768-8b1b-1ce1b05a87bb)

# [OSINT] 3636

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/d7dc1d0e-9eb2-4e61-8b42-fc99abbfc474)

以下の画像が渡されます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/352e1fe8-3e47-49d1-92bc-6f32cb1be94b)

チームの方が既に電話番号とドメインの一部から`とうみょう子ども園`で有ることを特定していました。

その周辺の施設をストリートビューで散歩していたら見つかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/672ef726-6fcb-47ef-8efe-846a78dba876)

`TsukuCTF23{37.502_139.929}`

# [OSINT] fiction

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/72bffb52-66da-4f60-aea0-6c54036a6c88)

![image](https://github.com/r1k0t3k1/note/assets/57973603/64ac2978-fbac-42cd-82f6-08098a90e2c9)

ゲーム上の画像？が渡されます。チームの方が`Valorant`というゲームの`Sunset`というマップであるということは調べてくれていたので、調べると当ゲームはマップごとに座標が割り当てられているらしく、検索すると下記のようなサイトがヒットし、記載されている座標を提出することでフラグとなりました。

https://valorant.fandom.com/wiki/Sunset

# [OSINT] river

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/1f4c9460-51a3-45e7-b3d1-b0ae6f931aa2)

以下の画像の座標を当てる問題です。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d7976f4d-e330-4290-9da7-31cd41aab917)

ニューギンの看板が目に付きます。

ニューギンの本部は名古屋の割と中心にあったと思いますが、名古屋の町並みっぽくなかったのでニューギン販売の営業所を当たることにしました。

会社のHPから支店を虱潰しに見ていくと鹿児島営業所付近であることがわかりました。

https://www.newgin.co.jp/company/overview/?tab=3

![image](https://github.com/r1k0t3k1/note/assets/57973603/6a41284c-0a84-4757-b97e-05c82f015c0b)

# [OSINT] sunset

問題文

![image](https://github.com/r1k0t3k1/note/assets/57973603/3fabde79-2370-49d9-8be9-72cb87a9e432)

運営のshioさんという方が以下の写真を撮った日時を答える問題です。

夕日が海側に見えるので多分西側かなとわかります。向こう側に陸地も少し見えます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/aea0493b-51da-4ceb-bab4-899982fc828e)

shioさんがなにかのイベント参加後に撮った、ということなのでイベントを特定します。

shioさんのxの2023年分の投稿をざっと漁った感じ、CTFに出題するほどの思い出がありそうなのは講師を努めていたSECCON2023新潟かなぁと、勘で推測しました。

このイベントは2023/9/10に開催されており、開催地は新潟コンピュータ専門学校で海が近いです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/1f995985-0baf-47f6-af2e-9446cbfaed18)

海側をストリートビューで散歩していると画像の風景に似た箇所を発見しました。

寄居浜というところですね。少し高い位置から写真が取られていたのは日和山展望台から撮影したのでしょうか。

![image](https://github.com/r1k0t3k1/note/assets/57973603/ca5c55aa-6207-4325-8038-110dd6ce647a)

場所がわかったので次は撮影日時ですが、写真では夕暮れである(日没に近い)ことがわかります。

2023/9/10の日没時間を調べると18:01であることがわかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/50ef84d1-e969-4e7d-8d00-ba89cba3295c)

まだ完全に日が沈んでいないことから18:01より前の時間を何回か入力することでフラグとして受け付けられました。



