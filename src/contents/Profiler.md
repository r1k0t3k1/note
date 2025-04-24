---
title: "IL Rewriting AMSI bypass with Rust"
id: "CLR-Profile-API"
description: "Windowsのセキュリティ機構をバイパスするツールを再実装してみた。"
author: "rikoteki"
createdAt: "2025-04-14"
isDraft: false
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
### 実装詳細

プロファイラ初期化の順で見ると以下の実装が必要

- DLLとしてビルド、DllGetClassObject関数の実装
- IClassFactoryインターフェースを実装したファクトリクラス
- ICorProfilerCallbackインターフェースを実装したクラス
- 
### DLLとしての実装

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

#### DllGetClassObjectの実装

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

#### IClassFactoryの実装

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

#### ICorProfilerCallbackの実装

`IClassFactory`の実装と同様の方法が使える

`ICorProfilerCallback`の場合は実装しなければいけないインターフェースが少し多くなる

が、大半の関数はIDEの自動実装機能で導出できるし、使わない関数なら中身は空実装(Ok(())を返すだけなど)で良い

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

// 同様に70メソッド程度を自動実装
```

中身の実装が必要なメソッドは以下

- ICorProfilerCallback::Initialize
- ICorProfilerCallback::JITCompilationStarted
- ICorProfilerCallback::JITCompilationFinished(JITコンパイルされたネイティブコードを確認するため、なくてもいい)

##### Initializeの実装

CLRがプロファイラを初期化する際に呼ばれるメソッド

https://learn.microsoft.com/ja-jp/dotnet/framework/unmanaged-api/profiling/icorprofilercallback-initialize-method

第一引数には`ICorProfilerInfo`インターフェースに変換可能な`IUnknown`インターフェースへのポインタが設定される

`Initialize`メソッド内ではCLRが発生させるプロファイラに関するイベント通知において、どのイベント通知を受け取るかを設定する必要がある

それができるのは`ICorProfilerInfo::SetEventMask`メソッドのみであり、`ICorProfilerInfo`が取得できるタイミングはこの`Initialize`メソッドの呼び出し時のみ

`windows-rs`の`IUnknown`は`cast`メソッドで安全にインターフェースを変換することができる

```rust
profiler_info.cast::<ICorProfilerInfo3>()?
```

取得した`ICorProfilerInfo`インタフェースから`SetEventMask`を実行する

引数には購読したい通知をビットマスクで指定する

一番重要なのは`COR_PRF_MONITOR_JIT_COMPILATION`でJITコンパイルの開始通知を受け取ることができる

```rust
unsafe {
    self.get_profiler_info().unwrap().SetEventMask(
        COR_PRF_MONITOR_ASSEMBLY_LOADS.0 as u32 |  // アセンブリの読み込み通知を購読
        COR_PRF_MONITOR_JIT_COMPILATION.0 as u32 | // JITコンパイルの開始通知を購読
        COR_PRF_USE_PROFILE_IMAGES.0 as u32,       // NGENにより予めJITコンパイルされたライブラリにおいてもJITコンパイルさせる
    )?
};
```

`COR_PRF_USE_PROFILE_IMAGES`はNGENによりJITコンパイル結果がキャッシュされているイメージにおいてもJITコンパイルさせるようにする

https://learn.microsoft.com/ja-jp/dotnet/framework/tools/ngen-exe-native-image-generator

今回フックしたい`ScanContent`はSMA.dllに定義されているがこれはNGENにより事前コンパイル結果がキャッシュされてしまっているため、このビットマスクを指定しないとJITコンパイルイベント通知が発生しない

![image](https://github.com/user-attachments/assets/c267c488-6b4f-4980-ac94-585f5fcf0f34)

##### JITCompilationStartedの実装

IL書き換え

![image](https://github.com/user-attachments/assets/08edcbd7-4372-411b-b156-7142ebe3140e)

![image](https://github.com/user-attachments/assets/50c6c1b3-e41a-4b98-be9b-dc0b0da08bce)

##### JITCompilationFinishedの実装

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

#### 全体の実装まとめ

1. エクスポート関数`DllGetClassObject`を実装し、`IClassFactory`を返却する
2. `IClassFactory`を実装し、`CreateInstance`メソッドでプロファイラを返却する
3. プロファイラに`ICorProfilerCallback`を実装する
4. プロファイラに`ICorProfilerCallback::Initialize`を実装し、購読したいイベントを設定する
5. プロファイラに`ICorProfilerCallback::JITCompilationStarted`を実装し、ILを書き換える
6. プロファイラに`ICorProfilerCallback::JITCompilationFinished`を実装し、書き換えたILを確認する(オプション)

### 検証
![Pasted image 20250410105030](https://github.com/user-attachments/assets/c245669a-971c-4a8b-b80c-007fb90404af)


InlineGetAppDomainの定義

[coreclr](https://github.com/dotnet/coreclr/blob/4b49e4330441db903e6a5b6efab3e1dbb5b64ff3/src/vm/amd64/JitHelpers_InlineGetAppDomain.asm)
