---
title: "Burp Suite拡張の作成を楽にするメモ\nWith IntelliJ IDEA"
id: "burp-extension-with-idea"
description: "Burp Suite拡張作成のメモです。"
author: "rikoteki"
createdAt: "2024-02-01"
isDraft: false
---

# ToC

# はじめに

Burp Suiteの拡張用APIが変更になり`montoya-api`というものに変わっていたのでAPI移行のついでに開発環境を整えるかぁ〜となりましたが、予想外に四苦八苦したのでメモを残します。

そして流石にIDE使った方が便利かぁ？と思いIntelliJ IDEAでBurp拡張を作ることにしました。

正直Java + IDEAよくわかってないので改善点あれば教えてください。

# IntelliJ IDEAのインストール

jetbrainsの公式ページからCommunity版をダウンロード

Community版のダウンロードリンクは下の方にあるので注意

https://www.jetbrains.com/ja-jp/idea/download/

# gradle のインストール

下記公式ページからダウンロード→解凍→パスを通す

https://gradle.org/install/#manually

# プロジェクトの作成

Intellij IDEAで新規プロジェクトを作成する

Build system以外は基本デフォルトでOK

Build systemはGUI Designerを使うためIntelliJ IDEAを選択

2024/2月現在、montoya-apiでのBurp拡張開発はJDK17を使用しないと行けないっぽいのでJDKだけ注意

![image](https://github.com/r1k0t3k1/note/assets/57973603/5b63ae41-eeb9-486a-a6ed-a49d39437739)


# プロジェクトファイル構成設定

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Modules -> + -> New module

![image](https://github.com/r1k0t3k1/note/assets/57973603/cb7ddbcd-5560-4209-bd5c-1646b70d5f57)

親モジュールと同じ設定でOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/10fcc88e-f511-4555-85ce-7aadd0902d69)

こんな感じのモジュール構成にしておく

demo-extensionモジュール -> srcフォルダ -> burpモジュール -> javaフォルダ -> demoパッケージ -> DemoExtensionクラス

![image](https://github.com/r1k0t3k1/note/assets/57973603/cd28fa7b-3033-419e-9316-111c8852fa77)

# MontoyaApiインストール

BurpのMontoyaApiを使うためのライブラリをインポートする

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Libraries -> + From Maven...

![image](https://github.com/r1k0t3k1/note/assets/57973603/9fff3dea-3136-4d04-a7e8-76cb22bef8a7)

montoya-apiの最新版を選択

![image](https://github.com/r1k0t3k1/note/assets/57973603/7cdbc375-2a49-4cb4-ab2e-b57b77dcdd56)

子モジュールに追加する(今回はburpモジュール)

![image](https://github.com/r1k0t3k1/note/assets/57973603/4958a944-2a5f-471e-a1ef-8fbc86d22c50)


# BurpExtensionの実装

自動生成されているMainファイルを好きなファイル名・クラス名に変更し、そのクラスにBurpExtensionインターフェースを実装する

BurpExtensionインターフェースは`MontoyaApi`クラスを引数に取る`initialize`メソッドがあればOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/e4fe4cef-d1e9-46e9-917b-387f81588e2d)

この状態でビルドに通ればMontoyaApiのインポートはOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/b94a8638-b8dc-4dd0-aa61-8eb3b586f8d4)

# Artifact生成の設定

前の手順でビルドしただけではBurpにロードするjarが生成されないので生成するように設定する

File -> Project Structure...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f5a57000-e0b5-45f5-8eb2-202ae86f928d)

Artifact -> + -> JAR -> From modules with dependencies...

![image](https://github.com/r1k0t3k1/note/assets/57973603/bb95e005-0cf4-4494-b48a-bd8a63f02a56)

デフォルトでOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/b3ee36a3-70d2-4f14-bb55-18a5a03a8050)

Include in project build...をON

![image](https://github.com/r1k0t3k1/note/assets/57973603/6b5f750e-b44d-4e6c-abae-22b1bc32e487)


この状態でビルドするとjarが生成される

![image](https://github.com/r1k0t3k1/note/assets/57973603/f996c7a6-c28b-41d1-8f84-a52388d869a7)

Burpが正常に拡張を読み込むことができるかテストするためにログコンソールに適当な文字列を出力させてみる

![image](https://github.com/r1k0t3k1/note/assets/57973603/936ea09e-5c9d-41df-b5c7-3c64506fed48)

![image](https://github.com/r1k0t3k1/note/assets/57973603/8f068f85-7c73-43be-86a7-f48b333d5625)

# GUI Designerを使って楽にGUIを設計する

Burp拡張のGUI部分を自力で書いていたけど流石に辛すぎたのでIDEAの力を借りる

IDEAでSwingのGUIコンポーネントを作成するにはNew -> Swing UI Designer -> GUI Designer

![image](https://github.com/r1k0t3k1/note/assets/57973603/83de4532-ca82-4c27-b6da-9e2608db858d)

命名以外はとりあえずデフォルトでOK

![image](https://github.com/r1k0t3k1/note/assets/57973603/3a59798a-e227-4304-a3c8-5be1370e38ab)

すると、ディレクトリとその直下にjavaクラスと.formファイルが生成される

.formファイルに関してはIDEAがいじるので基本的には触らない(が、細かいところの調整でたまに編集したりする)

![image](https://github.com/r1k0t3k1/note/assets/57973603/62cfb584-022c-459e-b417-4f6f9fe79d45)

.formをIDEAで開くとGUIでデザインができる

![image](https://github.com/r1k0t3k1/note/assets/57973603/ac386e0b-4945-4d0d-8434-b295b920a595)

だが、このままだとGUIでデザインした結果がjavaクラスファイルの方に反映されないためBurp拡張のコードからSwingコンポーネントを触ることができない

そのため、GUIの設定をjavaクラスに吐き出させるようにIDEAを設定する

File -> Settings...

![image](https://github.com/r1k0t3k1/note/assets/57973603/f6cc52e2-0440-4d19-94b1-ebc9f566bdb7)

Editor -> GUI Designer -> Generate GUI intoをJava source codeに変更する

![image](https://github.com/r1k0t3k1/note/assets/57973603/6c241490-31bf-4b8f-aae9-b4974b117059)

この状態でビルドするとJavaクラスにGUI Designerの結果が反映される

$$$setupUI$$$()や$$$getRootComponent$$$()などのメソッドが自動実装されていることがわかる

![image](https://github.com/r1k0t3k1/note/assets/57973603/24794cef-4971-4229-b9e9-5a6bf0941e5a)

ただし、ビルドは成功しているがIDE上エラーが出ている状態になってしまっているので足りない依存関係を追加する

![image](https://github.com/r1k0t3k1/note/assets/57973603/cadf95bd-2a96-4b3a-9503-5ada8586e1f2)

File -> Project Structure... -> Libraries -> + -> Java

![image](https://github.com/r1k0t3k1/note/assets/57973603/b356e277-0cb8-430e-9c0a-9cd5a1a34753)

IDEAのインストール先ディレクトリ以下のlib/forms_rt.jarをインポートする

![image](https://github.com/r1k0t3k1/note/assets/57973603/343f6519-42e8-489a-8948-768721fb9b43)

子モジュールを選択

![image](https://github.com/r1k0t3k1/note/assets/57973603/f45a2ea5-3052-4133-b937-6133607468c6)

再ビルドすると依存関係が解決されエラーが解消される

![image](https://github.com/r1k0t3k1/note/assets/57973603/93cc0c79-7656-47fa-80b5-ac4975fbb7ac)

# 自動生成されたクラスの使い方

自動生成されたクラスはコンストラクタに呼ばれる$$$setupUI$$$()によって自動で初期化される。

自動生成されたクラスは単純なものであれば以下のようにMontoyaApiに渡すことで使用できる

MontoyaApiのUI系のメソッドはjava.awt.Componentを要求する物が多いっぽい

GUI Designerによって自動生成されたクラスの$$$getRootComponent$$$()を呼ぶことでそのクラスの最上位のGUIコンポーネント(java.awt.Component)を取得することができる

![image](https://github.com/r1k0t3k1/note/assets/57973603/dd57820f-7d2c-4224-aec1-59e1eaf41f15)

montoyaApi.userInterface().registerSuiteTabでBurpに拡張用のタブを追加することができる

![image](https://github.com/r1k0t3k1/note/assets/57973603/fd9cb65b-0c8e-4d68-85eb-9302da54b54e)

#  自動生成されたクラスの使い方(応用)

自動生成されたクラス内のコンポーネント(JPanelやJButtonなど)の初期化方法をカスタマイズしたい場合はGUI Designerからカスタマイズしたいコンポーネントを選択し、Custom　createをONにする

![image](https://github.com/r1k0t3k1/note/assets/57973603/ec956376-3932-4663-bbcc-0b47612d9dc9)

すると、クラス内にcreateUIComponentメソッドが自動で定義されるためここに初期化処理を書いていく

![image](https://github.com/r1k0t3k1/note/assets/57973603/1f374a4c-b98b-4a38-91d5-5239d650e55b)


この状態でビルドすると$$$setupUI$$$()の先頭にcreateUIComponentの呼び出しが追加される

![image](https://github.com/r1k0t3k1/note/assets/57973603/8e387dc9-2faa-4d76-970c-0f07872521c8)

注意点として、Custom createをONにしたコンポーネントをcreateUIComponent内で初期化することを忘れると実行時エラーになるので注意

下ではcreateUIComponent内で初期化していないpanel1のメソッドを呼び出そうとしているが特にエラーは出ない

![image](https://github.com/r1k0t3k1/note/assets/57973603/1a7721e6-6944-4027-9e77-361049aeddb9)

# 外部ライブラリの使い方

Gsonなどのライブラリを使用しようとしてハマったのでメモ

(GsonはJsonシリアライズ・デシリアライズ用のライブラリ)

まず、普通に外部ライブラリをインポートしてビルドする手順

MontoyaApiをインポートしたときと同様の手順でインストールする

![image](https://github.com/r1k0t3k1/note/assets/57973603/3c949d8e-eeca-4060-acdd-1d051dcec915)

適当なクラスをJSON化してログコンソールに出力してみる

![image](https://github.com/r1k0t3k1/note/assets/57973603/041fb308-2462-4e25-8331-bc2ad52e820d)

拡張をロードした時点でcom.google.gson.Gsonが見つからないというエラーが出る

![image](https://github.com/r1k0t3k1/note/assets/57973603/9a41fbea-a1ff-4a92-bc45-33f175d920ad)

恐らく実行時に当該ライブラリが見つからないと言っているようなのでライブラリをArtifactに含める

Artifact設定をしたときと同様にArtifact画面を開き、Available ElementsからGsonを右クリックし、Extract into Output Rootを選択すると

![image](https://github.com/r1k0t3k1/note/assets/57973603/c4a20900-c934-4895-82e5-c471678c7922)

Output layoutにGsonが含まれるようになる

![image](https://github.com/r1k0t3k1/note/assets/57973603/2fde3853-54ef-4e31-b209-470300a4a61c)

この状態で再ビルドし、Burpに読み込ませると正常にクラスをJSON化した文字列がログコンソールに表示される

![image](https://github.com/r1k0t3k1/note/assets/57973603/836f8820-b87d-4b6e-bd81-9b0510432aba)



