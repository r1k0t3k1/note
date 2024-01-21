![image](https://github.com/r1k0t3k1/note/assets/57973603/e9f8f686-a0a6-4bab-baaa-41cad5aac7ed)---
title: "Offsec資格のレポート作成を楽にする\nwith Obsidian"
id: "offsec-report-with-obsidian"
description: "Obsidianを用いてOffsec系資格のレポートを楽に出力する方法をまとめました。"
author: "rikoteki"
createdAt: "2023-11-12"
isDraft: true
---

# ToC

# はじめに

# Obsidianのインストール



# obsidian-pandocのインストール

Community Pluginの有効化
![image](https://github.com/r1k0t3k1/note/assets/57973603/bda819fe-3bc3-4d7b-a275-b1d4fa6e904a)

![image](https://github.com/r1k0t3k1/note/assets/57973603/d400cfb7-170e-4c08-b17a-68b25dc0fa04)

`pandoc`で検索

![image](https://github.com/r1k0t3k1/note/assets/57973603/c1564468-172e-4bea-953e-0527b1c683e2)

`Install`

![image](https://github.com/r1k0t3k1/note/assets/57973603/c24e483f-7a81-4ea2-9b66-a5d185d96b85)

`Enable`
![image](https://github.com/r1k0t3k1/note/assets/57973603/a57ee7fc-a0cf-4b09-a07b-dafe07ef0953)

`Options`

![image](https://github.com/r1k0t3k1/note/assets/57973603/cc64d65b-d1a6-47f7-8064-ee753a758e80)

`pandoc path`

![image](https://github.com/r1k0t3k1/note/assets/57973603/c4c5e1f3-a294-4bb6-ba4f-e0fcab50ce21)

依存パッケージをインストール

```bash
sudo apt install texlive-latex-recommended texlive-fonts-extra texlive-latex-extra pandoc
```

`which pandoc`のファイルパスを`pandoc path`に入力する

![image](https://github.com/r1k0t3k1/note/assets/57973603/c838ebfe-3a5e-449b-95e2-249d1995ccef)

![image](https://github.com/r1k0t3k1/note/assets/57973603/5047027e-af4d-4e57-9ac6-01fbf8a73d13)


`OSCP-Exam-Report-Template-Markdown`から使用するテンプレートをダウンロードし、ObsidianにドラッグアンドドロップするなどしてVault内にコピーしておく。

https://github.com/noraj/OSCP-Exam-Report-Template-Markdown

```
wget https://github.com/noraj/OSCP-Exam-Report-Template-Markdown/raw/master/src/OSCP-exam-report-template_whoisflynn_v3.2.md -O OSCP-exam-report-template.md
```

`OSCP-Exam-Report-Template-Markdown`が依存している`eisvogel.latex`を`~/.pandoc/templates/`に配置する

https://github.com/Wandmalfarbe/pandoc-latex-template/releases/download/2.4.2/Eisvogel-2.4.2.zip

```bash
mkdir -p ~/.pandoc/templates/
wget https://github.com/Wandmalfarbe/pandoc-latex-template/releases/download/2.4.2/Eisvogel-2.4.2.zip -O ~/.pandoc/templates/eisvogel.latex.zip
cd ~/.pandoc/templates
unzip eisvogel.latex.zip
ls -1 |  grep -v -E '^eisvogel.latex$' | xargs rm -rf
```

この時点で`Ctrl+p`からコマンドパレットに`pandoc pdf`と入力し、`Pandoc Plugin: Export as PDF (via LaTeX)`を選択するとMarkdownをPDFに変換できる。

![image](https://github.com/r1k0t3k1/note/assets/57973603/c5670c66-805f-40bf-88db-08a34d62d547)

![image](https://github.com/r1k0t3k1/note/assets/57973603/144f4839-b245-49fc-a3a1-0b909ce278e8)

# 注意点

## 画像のパス

設定によってObisidian上で貼り付けた画像(スクリーンショット等)のパスが認識されずPDF上に画像が出力されない可能性がある。

Markdown

![image](https://github.com/r1k0t3k1/note/assets/57973603/1c4ea0b6-57e1-4046-ba3e-d21de5c8b5bf)

PDF

![image](https://github.com/r1k0t3k1/note/assets/57973603/7a019cc0-51c3-4282-973e-9e1f3b34432c)

この場合、設定の`Use [[wikilinks]]`を有効にすることで画像がPDFに出力されるようになります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/eb62f3e9-35fb-41b7-b38a-c099e1db0033)

Markdown

![image](https://github.com/r1k0t3k1/note/assets/57973603/2a828b75-d2ac-4e35-a147-1948d98d1d57)

PDF

![image](https://github.com/r1k0t3k1/note/assets/57973603/ad91d3e1-f96a-42c4-bbf4-647e958fe448)

## CodeBlock内の文字列がはみ出す

CodeBlock内の文字列が長すぎる場合、紙面からコードがはみ出る場合がある。

Markdown

![image](https://github.com/r1k0t3k1/note/assets/57973603/e2ff7ca6-f84d-4c23-a3fc-5cc7d4872e1e)

PDF

![image](https://github.com/r1k0t3k1/note/assets/57973603/797a0430-3eb7-46c6-8305-4cc9ac8e0bd5)

`Extra Pandoc arguments`に`--listings`を追加する。

![image](https://github.com/r1k0t3k1/note/assets/57973603/661e14e9-9e3c-4f09-bd4b-1f5e8afc2232)

```diff
--template eisvogel
--from markdown+yaml_metadata_block+raw_html
--table-of-contents
--toc-depth 4
--number-sections
--top-level-division=chapter
--highlight-style breezedark
--resource-path=.:src
+ --listings
```

この設定で再度PDFを出力すると、はみ出た部分が折り返される。

![image](https://github.com/r1k0t3k1/note/assets/57973603/4c644a31-64b8-494e-8967-d3378ff3c480)


# まとめ
