---
title: "CLRプロファイルAPIによるセキュリティバイパスの探求 with Rust"
id: "CLR-Profile-API"
description: "Windowsのセキュリティ機構をバイパスするツールを再実装してみた。"
author: "rikoteki"
createdAt: "2025-04-14"
isDraft: true
---

## はじめに

### CRTPで説明されたInvisi-Shell

CRTPというADに対する攻撃に主眼を置いた資格試験のラボをやっていた

この試験では基本的なWindowsの侵入検知機構が有効になっておりそれらをバイパスした上で目的を達成する必要がある

[Certified Red Team Professional (CRTP)](https://www.alteredsecurity.com/post/certified-red-team-professional-crtp)

読む資料や取り組むラボの順番を間違えたかもしれんが、唐突に「AMSIに検知されるから最初にこのツール実行しろ」と説明されていて無事スクリプトキディに

[OmerYa/Invisi-Shell: Hide your Powershell script in plain sight. Bypass all Powershell security features](https://github.com/OmerYa/Invisi-Shell)

(ちなみにこのツールにはAMSI以外の検知処理を無効化する仕組みも入っているが今回はAMSIにフォーカスした)

### Invisi-Shellの仕組みに対する興味

AMSIバイパスの手法には一番有名なものとして`AmsiScanBuffer`関数の先頭アドレスを取得してパッチを当てるというバイパス手法があるが、Invisi-Shellのコードを見た感じ少し異なる手法を取っていたので見てみた

## 1. Invisi-Shellとは

### 概要と背景

Invisi-Shellの使い方はdllとbatを配置した後、batを実行するだけだが、bat内では環境変数設定、レジストリ書き込みだけしてpowershell起動しているだけだった

付属のDLLへのパスがレジストリに書き込まれていたので恐らくDLLがバイパス処理の実体だろう

RunWithRegistryNonAdmin.bat

```powershell
set COR_ENABLE_PROFILING=1
set COR_PROFILER={cf0d821e-299b-5307-a3d8-b283c03916db}

REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}" /f
REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}\InprocServer32" /f
REG ADD "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}\InprocServer32" /ve /t REG_SZ /d "%~dp0InvisiShellProfiler.dll" /f

powershell

set COR_ENABLE_PROFILING=
set COR_PROFILER=
REG DELETE "HKCU\Software\Classes\CLSID\{cf0d821e-299b-5307-a3d8-b283c03916db}" /f
```

後でDLLも見ていくがとりあえず環境変数`COR_ENABLE_PROFILING`と`COR_PROFILER`が気になったので調べると、「プロファイルAPI」という機能が.NET Framework環境に存在することを知った

[プロファイル (アンマネージ API リファレンス) - .NET Framework | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/)

### 使用されているセキュリティバイパスの手法

プロファイルAPIは割と古い技術で、調べるといろいろな方が実装されていた

[うらぶろぐ @urasandesu: 10月 2011](https://urasandesu.blogspot.com/2011/10/)

[Windowsで、実行ファイルを書き換えずに既存の.Netアプリケーションのメソッドを置き換える話 - math314のブログ](https://math314.hateblo.jp/entry/2017/01/22/005048)

上記のブログに書かれているが、プロファイルAPIを使用するとCLRでJITコンパイルされる前のILコードを書き変え、特定の関数の処理を変更することができるらしい

Invisi-Shellはこの手法を用いて検知等に使用されている関数の処理を書き変えていることが分かった

## 2. 技術的基盤：CLRプロファイラAPI

### CLRプロファイルAPIの役割と機能

プロファイルAPIは本来.NET実行環境の内部動作を監視・分析・操作するためのインターフェースであり、アプリケーションの性能分析やデバッグなどに使用することを目的として開発されたようである

[プロファイル (アンマネージ API リファレンス) - .NET Framework | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/)

プロファイルAPIのアーキテクチャは、主に以下の要素で構成されている

- CLR(共通言語ランタイム=.NET実行環境)
- CLRにより実行される.NETアプリケーション
- プロファイラ(今回実装する対象)

![Pasted image 20250410131159](https://github.com/user-attachments/assets/304e6d78-c8e4-4e8e-ac9c-1185520a00e1)


引用元: https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/media/profiling-overview/profiling-architecture.png

今回の関心対象はプロファイラなのでその実装と機能を中心に詳しく見ていく

#### プロファイラの初期化と登録

CLRはプログラム実行時に特定の環境変数が設定されている場合、それらの値とレジストリの情報を基にプロファイラを読み込む

(一般的にプロファイラはDLLの形式で提供されている)

環境変数の値

```
COR_ENABLE_PROFILING=1
COR_PROFILER={プロファイラのCLSID}
```

レジストリエントリ

```
HKCU\Software\Classes\CLSID\{プロファイラのCLSID}
HKCU\Software\Classes\CLSID\{プロファイラのCLSID}\InprocServer32 // プロファイラDLLへのパス
```


Invisi-Shellの`RunWithRegistryNonAdmin.bat`ではレジストリに`CLSID`や`InProcServer32`への書き込みがあるが、これはプロファイラDLL内にCOMオブジェクトが定義されていることを示している

また、このCOMオブジェクトにはプロファイラとして動作するためのインターフェース`ICorProfilerCallback`が実装されている必要がある

[ICorProfilerCallback Interface - .NET Framework | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/unmanaged-api/profiling/icorprofilercallback-interface)

このインターフェースを実装していることにより、CLRがプロファイラDLLを読み込んだ後、`ICorProfilerCallback`経由で実行時の情報がやり取りできる

### 実行時ILコード書き換えのメカニズム

.NETアプリケーションの実行時、JITコンパイラによってILコードがネイティブコードに変換される

`ICorProfilerCallback`にはこの変換プロセスにおいてフックするポイントが複数用意されている

ILの書き換えにおいて重要なのは`ICorProfilerCallback::JITCompilationStarted`である

```c++
HRESULT JITCompilationStarted( [in] FunctionID functionId, [in] BOOL fIsSafeToBlock);
```

[ICorProfilerCallback::JITCompilationStarted Method - .NET Framework | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/unmanaged-api/profiling/icorprofilercallback-jitcompilationstarted-method)

このコールバックは`functionId`を持つ関数がJITコンパイルされる前に呼び出されるため、このメソッドを実装することでJITコンパイル前にILコードを書き変えることができる(詳細な実装は後述)

## 3. 再実装に必要な技術要素

ここまででプロファイラとしてCLRに読み込ませるためには以下が必要であることが分かった

1. DLLとしての実装
2. COMオブジェクトの実装
3. 2で実装したCOMオブジェクトへの`ICorProfilerCallback`インターフェースの実装
4. `ICorProfilerCallback::JITCompilationStarted`内での対象ILの書き換え


### DLLの基礎知識

まず最小のDLLを実装できる必要がある

[ダイナミック リンク ライブラリ (DLL) - Windows Client | Microsoft Learn](https://learn.microsoft.com/ja-jp/troubleshoot/windows-client/setup-upgrade-and-drivers/dynamic-link-library)

C++での実装例は以下の通りでこのシグネチャに則った`DllMain`関数をエクスポートすればプロセスやスレッドがDLLにアタッチ、デタッチした際に呼び出される処理を記述できる

```c++
BOOL APIENTRY DllMain(
HANDLE hModule,// Handle to DLL module
DWORD ul_reason_for_call,// Reason for calling function
LPVOID lpReserved ) // Reserved
{
    switch ( ul_reason_for_call )
    {
        case DLL_PROCESS_ATTACHED: // A process is loading the DLL.
        break;
        case DLL_THREAD_ATTACHED: // A process is creating a new thread.
        break;
        case DLL_THREAD_DETACH: // A thread exits normally.
        break;
        case DLL_PROCESS_DETACH: // A process unloads the DLL.
        break;
    }
    return TRUE;
}
```

ただ、今回はDLLとしてアタッチ、デタッチされる際の処理は不要なので省略しても問題ない

COMオブジェクトとして動作させるために後述する関数をエクスポートする

また、上記の例はC++実装なのでRust実装に変換する必要がある

### COMインターフェイスの理解

以下の公式説明を読んでもなんだかピンとこないがClaudeが要約するに
`COM（Component Object Model）はMicrosoftが開発したバイナリインターフェース規格で、異なるプログラミング言語で書かれたソフトウェアコンポーネント間の通信を可能にする技術`らしい 

[COM の技術概要 - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/com-technical-overview)

[コンポーネント オブジェクト モデル (COM) - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/component-object-model--com--portal)

たしかにCLRとC++の連携を提供しているし、今回実装するプロファイラはRust製だがCLRやC++で書かれたCOMオブジェクトと通信が可能だ

COMには大別して`インターフェース`と`クラス`、`オブジェクト`という概念があるらしい

この辺は調べた感じプログラミング言語によくあるそれらとほぼ同じ概念だろう

#### COMインターフェース

COMインターフェースは一般的なインターフェースと同様にCOMクラスに対して実装するメソッドを定義する

システム内で名前が重複してもいいように各COMインターフェースには`IID`と呼ばれる128bitのGUIDを設定する必要があり、この`IID`で識別される

COMインターフェースは継承が可能で、インターフェースAを継承したインターフェースBにはインターフェースAのメソッドを実装することが強制される

[Interfaces (COM) - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/com/interfaces)

ただし、複数のインターフェースを継承することはできないっぽい

今回実装する`ICorProfilerCallback`にも現在`ICorProfilerCallback9`までが存在しており、おそらく`ICorProfilerCallback9`が`ICorProfilerCallback8`を継承し、`ICorProfilerCallback8`が`ICorProfilerCallback7`を継承し…のように単一継承の制限があるのでこのように機能を拡張していってるのかな？
#### COMクラス

COMインターフェースを実装した実体

COMインターフェースを実装したCOMクラスはCOMインターフェースで定義されているメソッドの実装を全て提供する必要がある

COMクラスには`IID`と同様に`CLSID`と呼ばれる128bitのGUIDを定義する必要がある

COMクラスを呼び出す側は主にこのCLSIDを用いて呼び出すクラスを識別している

「プロファイラの登録と初期化」の章でプロファイラのCLSIDをレジストリに登録する必要があると書いたが、このことからプロファイラはCOMクラスとして提供されていることがわかる

プロファイラを実装する場合、`CLSID`からCOMクラスのインスタンスを作成するために`IClassFactory`を実装したCOMクラスを定義する必要がある

これはCLRがプロファイラを読み込もうとする際、CLRが`CoGetClassObject`などの方法を用いずにCOMオブジェクトを取得しようとすることに起因すると思われる(以下にIClassFactoryを実装する必要がある場合について記載有)

[COM クラス オブジェクトと CLSID - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/com-class-objects-and-clsids)

#### COMオブジェクト

COMクラスの定義から実行時にメモリ上に作成されたオブジェクト

一般的なオブジェクト指向プログラミング言語に合わせるならインスタンスとも言える

#### IUnknownインターフェース

全てのCOMインターフェースが継承しているインターフェース

以下の三つのメソッドを定義しており`QueryInterface`によって他のインターフェースのポインタを取得し、その実装を使用することができる

```c++
HRESULT QueryInterface(REFIID riid, void **ppvObject);
ULONG AddRef(); 
ULONG Release();
```

その他のメソッドは自身の参照を管理するカウンタのようなもの

---

再実装に必要な情報はあらかた調べ終わったので今度はRustで実装するにはどうするか調べながら実装していく

`ICorProfilerCallback`の詳しい実装も実装しながら見ていく

## 4. Rustでの実装への道

まずRustでDLLやWindows APIを使用するためにMicrosoft公式の`windows-rs`クレートを使用することにした

以前にAMSI Providerを作成した際にも同クレートを使用したため、ある程度使用方法は分かっている(つもり)

[windows - Rust](https://microsoft.github.io/windows-docs-rs/doc/windows/)

### プロジェクトの準備

`windows-rs`クレートのドキュメントに沿って実装していく

[Creating your first DLL in Rust - Kenny Kerr](https://kennykerr.ca/rust-getting-started/creating-your-first-dll.html)

重要なの要素は以下

- libクレートとしてプロジェクトを作成する
- Cargo.tomlのlibセクションに`crate-type = ["cdylib"]`を指定する

cargo generateを使ってDllMainを持つ初期コードを生成しても良い

```sh
cargo install cargo-generate

cargo generate --git https://github.com/r1k0t3k1/rust-windows-template.git
```

### DLLとしての実装

以下に則った関数を実装すればOK

- エクスポートする関数に`#[no_mangle]`アトリビュートを設定し、関数名のマングリングを抑制する
- 関数定義の先頭に`extern "system"`を付与し、呼び出し規約を指定する

関数実装例
```rust
#[no_mangle]
extern "system" fn func() -> i32 {
    0
}
```

ここまででビルドすれば指定した関数がエクスポートされたDLLが生成できる

PE解析ツールのスクショ

### COMインターフェースの実装

### ICorProfilerCallbackの実装

- Rustから.NET連携の課題
- FFIの活用方法
- COMインターフェイスをRustで扱う

## 5. 実装のポイント

- プロファイラの登録と初期化
- ILコード書き換えの実装
- セキュリティ検知回避のテクニック

## 6. 検証と結果

- 実装の動作確認
- オリジナルとの比較

## 7. セキュリティへの示唆

- このような技術の両義性
- 防御側の視点からの考察

## まとめと今後の展望







# 実装

## DLL部分

## COMオブジェクト部分

### ハマりポイント
## プロファイラ部分

![Pasted image 20250410105030](https://github.com/user-attachments/assets/c245669a-971c-4a8b-b80c-007fb90404af)
