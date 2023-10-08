---
title: "maldoc in PDFで遊ぶ"
id: "play-with-maldoc-in-PDF"
description: "maldoc in PDFについて調べて、遊んでみました。"
author: "rikoteki"
createdAt: "2023-10-07"
isDraft: false
---

# 要約
この記事は所属組織の勉強会で発表した内容のコピーです。

内容は以下のとおりです。

- maldoc in PDFが気になったので色々調べてみる。
- maldoc in PDFをWordでもPDFビューアーでも開けるようにするための検証をする。
- 検証結果を元に両刀のファイルを作成する。

# maldoc in PDFとは

2023/8/22にJPCERT/CCが発表した、`PDFファイル内に悪性のWordファイルを埋め込む方法`のことです。

JPCERT/CCが報告した元記事はコチラです。

[https://blogs.jpcert.or.jp/ja/2023/08/maldocinpdf.html](https://blogs.jpcert.or.jp/ja/2023/08/maldocinpdf.html)

一見ファイルタイプがPDFのように見えますが、JPCERT/CCの報告では拡張子が`doc`になっており、Wordで開くとVBAで悪性のコマンドが実行されてしまうというものです。

# 解析してみる

予め無害化しておいた検体を解析していきます。

## ファイルタイプ

報告通り、ファイルタイプはPDFファイルとして認識されています。

![image](https://github.com/r1k0t3k1/note/assets/57973603/78e34ec9-657c-4919-b726-67060eb063f9)

マジックバイトもPDFのそれと一致していることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/10b9a53b-ca62-46a1-82a8-110999a5a17a)


## 主要なビューアーで開いてみる

主要なビューアーで開いてみましたがPDFとしては破損しているようで正常に開けたビューアーはありませんでした。

### Adobe Acrobat Readerの場合

![image](https://github.com/r1k0t3k1/note/assets/57973603/f730b507-d0f7-4bfd-b775-9c336ab9a89a)

### PDF XChange Viewerの場合

![image](https://github.com/r1k0t3k1/note/assets/57973603/2c8c5beb-4053-4354-aa54-9b19834004a9)

スクショ取り忘れましたが、Chromeなどのブラウザでも正常に開くことはできませんでした。

# なぜPDFとして開けないのか

ファイルタイプはPDFとして認識されているのになぜビューアーで開くことができないのかを追加調査しました。

まず、PDFの構造について大雑把に理解した結果、下記のようになっていることがわかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/66fed375-419d-41c2-ba64-75e25330be16)

この内、トレイラーの末尾（ファイル末尾）には`%%EOF`というシグネチャが出現します。(LFは有っても無くてもいいっぽい)

下記は有効なPDFの末尾を表示した結果です。末尾に`%%EOF`が出現しています。

![image](https://github.com/r1k0t3k1/note/assets/57973603/142886b9-29b3-4ad3-b4d9-e539cd20e24d)

対して検体の末尾には`%%EOF`が確認できませんでした。

![image](https://github.com/r1k0t3k1/note/assets/57973603/9def1604-f22d-4a4c-a080-404ab03d29e6)

それどころか検体には前述の`トレイラー`セクション自体が確認できませんでした。

有効なPDF

![image](https://github.com/r1k0t3k1/note/assets/57973603/4389850e-cefb-4e51-b48d-71c4f2507277)

検体

![image](https://github.com/r1k0t3k1/note/assets/57973603/8162675f-6c0a-40cd-98d2-0a345ee99345)

以上のことから、`maldoc in PDF`はPDF部分の末尾が、PDFとして有効でないためPDFビューアーでは開けない、と推測しました。

JPCERT/CCの記事では拡張子が「doc」になっていたようなのでPDFファイルとして開けるようにはしてないのでしょうか？（docとして認識されるのが回避できればいいから）

この時点で私のモチベーションが`WordでもPDFビューアーでも開けるmaldoc in PDFを作る`になりました。

とはいえもう少し調べる必要があるので解析を継続します。

# ファイル抽出

`maldoc in PDF`はPDFファイルの後ろにMHTMLという形式のファイルがくっついている感じになっています。

検体を確認すると、MHTMLファイル部分が0x239から開始されていることがわかります。
(MTHMLファイルは`Mime-Version:`というヘッダから始まるようです。)

![image](https://github.com/r1k0t3k1/note/assets/57973603/53eda0ff-a5a3-42c6-bc65-e5fe49bf538f)

MHTML部分はファイル末尾まで続いていたため、`dd`コマンドで0x239からファイル末尾を別ファイルとして保存します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7327ed3b-9844-4c52-b7cd-eac50028d7d2)

抽出されたファイルはHTML形式として認識されているようです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/03a94667-2a83-4591-88cb-17818b55b218)

抽出されたファイルを確認すると、ファイル先頭にPDFに現れる文字列が出現していたり、スペースや大文字小文字が入り混じっているのが特徴的です。

![image](https://github.com/r1k0t3k1/note/assets/57973603/07d8dcf3-4a1e-40b8-8fdd-68dc557cbb26)

このHTML要素のうち、「<link rel=3DEdit-Time-Data>」はマクロのエンコードに使用されるActiveMimeというファイル形式を指すということがわかりました。

そして、そのhref属性に参照先が載ってくるとのこと。

![image](https://github.com/r1k0t3k1/note/assets/57973603/295ebbda-058e-4695-9dae-a24aa00d851b)

href属性をURLデコードすると「lonhzFH_files/image7891805.jpg」になります。

そしてMHTMLファイル内で「lonhzFH_files/image7891805.jpg」を文字列検索すると、以下の部分がヒットします。

![image](https://github.com/r1k0t3k1/note/assets/57973603/996ae42a-9e82-4e45-83c6-72020896c864)

`Content-Transfer-Encoding`からこの文字列は難読化されたBase64文字列だということがわかりますので、まずこの部分をファイルとして抽出します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/a831e440-4353-4f29-9201-5f52dee5cece)


スペースやLFでパディングされていたので削除して難読化を解除します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/ef57ec5e-c032-4c58-8505-67e0f27786d0)

その後、Base64デコードすると`ActiveMime`というシグネチャが出現します。このデータをファイルとして保存しておきます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/5b46516c-addc-40d5-9b80-7dcc0c269178)

ActiveMime形式について色々調べていると、この形式はoffset 0x32に`zlib`が出現するということがわかりました。

[https://github.com/idiom/activemime-format](https://github.com/idiom/activemime-format)

バイナリを確認してもそのようになっています。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d77a525f-a704-46cc-b3a4-4a6972e1e502)


ということで`zlib`部分を抽出してdecompressします。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d64a05cd-eac6-4fbc-80bc-ff46a82c6caf)

decompressしたファイルのマジックバイトを確認すると、旧OfficeのOLE2フォーマットだということがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/5faa2e7a-bdfa-43a0-be50-de4d9bdfeae7)

OLE2フォーマットということがわかったので`oletools`が使用できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/fad64561-1cf0-4cbe-bed4-5f033c2416c3)

![image](https://github.com/r1k0t3k1/note/assets/57973603/e88ff397-b1df-40da-bc72-296198e85ac2)

ここまでで、OLE2フォーマットが埋め込まれていることはわかりましたが、新しい疑問が出てきます。

# なぜファイル先頭にPDFが存在するのにWordで開けるのか

WordはMHTMLファイルの先頭部にPDFが存在するのに、なぜ正常にMHTMLファイルを開けるのか、が疑問です。

Twitterでは下記のようなコメントもあったため、Wordの挙動を検証してみます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/66e6a027-1175-496d-88ca-7cbedd40abd5)


まず、適当なWordファイルを作成します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/20f9712c-3aff-4fc3-92fb-4c66a7eb8f94)

ファイルをMHTML形式として保存します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7f6265ba-859b-412b-b592-dfd3cb915525)

保存したMTHMLファイルは検体のMTHML部分と似たような構造になっていることが確認できます。(当然ですが。)

![image](https://github.com/r1k0t3k1/note/assets/57973603/2f53dab4-fc9c-476c-80f9-0bf363f9436d)

保存したMTHMLファイルはもちろんWordで開くことができます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/d3d4943f-a682-4fa7-9745-95a83022df9b)

検証のため、このファイルの先頭にゴミ文字列を入れてみます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/19321c78-faec-48fa-b9d4-32d54fae63f3)

依然Wordで開くことができました！

![image](https://github.com/r1k0t3k1/note/assets/57973603/7c6c6ed5-3d82-4dee-8ec6-251eebd0ca84)

ファイル先頭にゴミ文字列があっても正常に開ける、となると次に気になるのは何バイトまでゴミ文字列を挿入できるかというところです。

この疑問を検証してみたところ、どうやら4082バイトまでは挿入できるようでした。

OK

![image](https://github.com/r1k0t3k1/note/assets/57973603/8a86c91b-8490-47e6-bed4-1b463207f663)

NG

![image](https://github.com/r1k0t3k1/note/assets/57973603/bf10dcb6-783e-4deb-805f-b725a7cd1384)

4082バイトを超える文字列を挿入すると下記のように、MHTML部分がそのまま文字列として表示されてしまう状態になりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/df1f65c3-39e4-4b70-8cde-48ad28334c73)

![image](https://github.com/r1k0t3k1/note/assets/57973603/21aaf230-daf2-40a4-8941-d7e8f5a6cb1b)

なぜ、4082バイトという中途半端な数字なのか辻褄を合わせてみたところ、`4082+len("MIME-Version: ")`でちょうど4096バイトになることがわかりました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/a9e566b5-9b3c-4366-a326-ab09aa4cd223)

この辺の仕様については詳細に述べられている資料が見つからなかったのであくまで推測ですが、ファイル先頭から4095バイト以内に`MIME-Version:`が出現する、
またはファイル先頭から4096バイト以内に`MIME-Version: `(スペース含む)が出現するMHTMLファイルはWordが開けるのではないでしょうか。

この推測が正しいとするとMHTMLファイルの先頭に埋め込めるPDFデータは4080バイト以内であればOKということになります。

# PDFビューアーはPDFファイルの後ろにゴミデータがあっても開けるのか

次にPDFとして開くための検証です。

maldoc in PDFはPDFの後ろにMHTMLが存在します。

したがって、PDFビューアーが`%%EOF`の後ろにゴミ文字列があった場合にどのような挙動をとるか検証を行います。

適当なPDFファイルの末尾に適当な文字列を追加して見ます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/2555be4e-2924-4aa0-b3ae-0300c720fbaa)

この状態でPDFビューアーで開いてみても正常に開けることが確認できます。

検証では4096バイトを追記しましたが、10MB書き込んでも正常に開けることを確認しています。

![image](https://github.com/r1k0t3k1/note/assets/57973603/7fc65906-d064-441c-973a-6fe1aa09c067)

このことからPDFビューアーはファイル末尾にゴミ文字列があろうと`%%EOF`からパースを始めるんだろうということが推測できました。

そのため、maldoc in PDFのMHTML部分はある程度自由にコンテンツを作成することができそうです。

# maldoc in PDF 作成

ExcelやWordから作成したPDFは4080バイトを余裕で超えてしまうので、検体からPDF部分のデータを拝借します。
表示される文字列部分はそれっぽい文章に編集しました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/1bf71e85-3c40-4e60-b3cf-2db5f15e9cf2)

続いて組み合わせるMHTMLファイルを作成します。

VBAを実行させるのでまず適当なマクロを記述してからMHTMLファイルとして保存します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/19864ab5-9c92-4d10-a3f7-9094aa357e18)

PDFとMHTMLを結合して保存します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/eea0ca1e-f690-4029-92e5-166c182d8b87)

# 結果

保存したファイルの拡張子をPDFとして開くとPDF部分に定義した文字列が表示されます。

また、拡張子をdocにして開くとVBAが実行され電卓が起動されます。

この動画ですとマクロを有効化にするダイアログが出ていませんが通常はそのダイアログの`有効化する`を選択しないとマクロは実行されないはずです。

今回は事前に有効化してしまっていたので表示されていません。

![image](https://github.com/r1k0t3k1/note/assets/57973603/0a44a590-e6b1-4ecc-8c2e-bbd7a82a8712)

# まとめ
- PDFビューアーは`%%EOF`の後ろにゴミ文字列があろうが関係なく開ける。
- MHTMLファイルはファイル先頭に4080バイト以内のゴミ文字列があってもWordで開ける。
- PDFファイル部分を4080バイト以内に収めればPDFビューアーでもWordでも開けるファイルが作成できる。

