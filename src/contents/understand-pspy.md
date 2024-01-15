---
title: "pspyを理解する"
id: "pspy"
description: "pspyがどのようにプロセスを見ているかを解説します。"
author: "rikoteki"
createdAt: "2024-01-15"
isDraft: false
---

# ToC

# pspyとは

Linuxにおけるプロセススパイのツールです。

https://github.com/DominicBreuker/pspy

主な用途は、カレントユーザー以外のユーザー権限で実行されているプロセスのコマンドラインを確認することです。

例えばカレントユーザー以外の権限で設定されたCronジョブが定期的に実行されている場合、`/var/spool/cron`以下に設定ファイルがあるとroot権限無しではそれぞれの設定を読み取ることができませんが、pspyを対象ホスト上で実行することで定期実行されたプロセスのコマンドラインを確認することができます。

`ps`コマンドなどでもプロセスのコマンドラインは取得できますがpspyを使用すると生存期間がごく短いプロセスも捕捉することができます。

HackTheBoxなどのBoot2RootCTFの簡単な問題では、コマンドライン引数にクレデンシャルを設定しているプロセスがあったり、誰でも読み書きできるシェルスクリプトをroot権限で実行している、など権限昇格の手がかりになることがあります。

pspyは`procfs`を監視することでプロセスの情報を取得しています。

# procfs

`procfs`は`/proc`にマウントされているプロセス情報を管理しているファイルシステムです。

ファイルシステムと言ってもデータの実態はメモリ上に存在しており、procfsへのアクセスによるディスクアクセスは発生しません。

プロセス管理用のシステムコールを削減するために実装された仕組みのようです。

## /proc

新しくプロセスが実行された場合、そのプロセスのPIDでディレクトリが切られるため、このディレクトリを監視することで現在実行されているプロセスのPID一覧が取得できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/9ced317f-9d88-4d1f-8cec-2a400ac7a268)

## /proc/[PID]

このディレクトリには`[PID]`のプロセスに関する情報が存在します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/2d145b35-4f71-4ed8-bb16-e8acb26d8191)

## /proc/[PID]/cmdline

このファイルを読み取ることで`[PID]`のプロセスが開始された際のコマンドラインが確認できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/15810f7f-ba54-40c3-833f-4bea7550fe53)

## /proc/[PID]/status

以下のようにプロセスの様々なステータスが確認できます。

が、pspyが使用するのは`Uid`と`Gid`の部分のみだと思います。

```
Name:   npm run preview
Umask:  0022
State:  S (sleeping)
Tgid:   5042
Ngid:   0
Pid:    5042
PPid:   4995
TracerPid:      0
Uid:    1000    1000    1000    1000
Gid:    1000    1000    1000    1000
FDSize: 64
Groups: 4 20 24 25 27 29 30 44 46 100 106 111 117 124 125 993 1000
NStgid: 5042
NSpid:  5042
NSpgid: 5042
NSsid:  4995
Kthread:        0
VmPeak:   795820 kB
VmSize:   731052 kB
VmLck:         0 kB
VmPin:         0 kB
VmHWM:     81520 kB
VmRSS:     73228 kB
RssAnon:           31628 kB
RssFile:           41600 kB
RssShmem:              0 kB
VmData:   102284 kB
VmStk:       132 kB
VmExe:        16 kB
VmLib:     38612 kB
VmPTE:      1504 kB
VmSwap:        0 kB
HugetlbPages:          0 kB
CoreDumping:    0
THP_enabled:    1
untag_mask:     0xffffffffffffffff
Threads:        15
SigQ:   0/30943
SigPnd: 0000000000000000
ShdPnd: 0000000000000000
SigBlk: 0000000000000000
SigIgn: 0000000001001000
SigCgt: 0000000108014602
CapInh: 0000000800000000
CapPrm: 0000000000000000
CapEff: 0000000000000000
CapBnd: 000001ffffffffff
CapAmb: 0000000000000000
NoNewPrivs:     0
Seccomp:        0
Seccomp_filters:        0
Speculation_Store_Bypass:       thread vulnerable
SpeculationIndirectBranch:      conditional enabled
Cpus_allowed:   ff
Cpus_allowed_list:      0-7
Mems_allowed:   00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000000,00000001
Mems_allowed_list:      0
voluntary_ctxt_switches:        58
nonvoluntary_ctxt_switches:     26
```

ここまでの説明で、プロセスの監視をするなら`/proc`以下を無限ループで`/proc/[PID]`のディレクトリリストを取得し、それぞれの`/proc/[PID]/cmdline`を読み取ればpspyと同じことができるんじゃないかと思われた方もいるかと思います。

実際、そのとおりで下記のような簡単なプログラムでpspyと同様の処理が可能です。

<details>
  <summary>Pythonコード</summary>
  
```python
import os
import re
from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED

plist = dict()

def get_processinfo(p):
    cmdline = open(f"/proc/{p}/cmdline","r").read()
    plist[p] = cmdline.replace("\x00"," ").strip()

    status = open(f"/proc/{p}/status","r").read()
    m = re.search(r"Uid:\t\d+\t\d+\t(?P<uid>\d+)", status)
    uid = m.group("uid")
    print(f"PID: {p} | UID: {uid} | {plist[p]}")

def main():
    while True:
        pids = [f.name for f in os.scandir("/proc") if f.name.isdigit() and f.name not in plist]
        if len(pids) == 0:
            continue
        with ThreadPoolExecutor(max_workers=len(pids)) as executor:
            tasks = [executor.submit(get_processinfo, p) for p in pids]
            wait(tasks, return_when=ALL_COMPLETED)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        os._exit(0)
```

</details>

![image](https://github.com/r1k0t3k1/note/assets/57973603/bf385ca7-d8f0-486a-ba3b-58be38811c9c)

root権限で実行されたプロセスのコマンドラインも取得できていることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/dd0ac51f-548d-45ed-b770-7b6e4ae0d6da)

# 問題点

ただし、このプログラムには問題があります。

## CPU使用率

無限ループで絶え間なく処理を続けているため、上記スクリプト実行中はCPU使用率が99%~100%程度に張り付きます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/cbed30a3-3484-416c-9cd1-e2b1d7eacb9d)

この状態だとシステム管理者側に怪しい挙動として検知される可能性があります。(HackTheBoxなどのBoot2Rootではこのスクリプトでも十分かと思いますが。)

また、ペネトレーションテストで使用する場合、顧客側の環境に負荷を掛け過ぎて環境を破壊する可能性もあるので安易には使用できません。

### 改善してみる

CPU使用率を低減するため、上記のスクリプトに少し手を入れてみます。

具体的には、1度のループ処理の後、処理を任意の秒数ブロックさせます。

<details>
  <summary>改善後のコード</summary>

```diff
import os
import re
+ import time
from concurrent.futures import ThreadPoolExecutor, wait, ALL_COMPLETED

plist = dict()

def get_processinfo(p):
    cmdline = open(f"/proc/{p}/cmdline","r").read()
    plist[p] = cmdline.replace("\x00"," ").strip()

    status = open(f"/proc/{p}/status","r").read()
    m = re.search(r"Uid:\t\d+\t\d+\t(?P<uid>\d+)", status)
    uid = m.group("uid")
    print(f"PID: {p} | UID: {uid} | {plist[p]}")

def main():
    while True:
        pids = [f.name for f in os.scandir("/proc") if f.name.isdigit() and f.name not in plist]
        if len(pids) == 0:
            continue
        with ThreadPoolExecutor(max_workers=len(pids)) as executor:
            tasks = [executor.submit(get_processinfo, p) for p in pids]
            wait(tasks, return_when=ALL_COMPLETED)
+           time.sleep(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        os._exit(0)
```

</details>

めちゃくちゃ簡単なテコ入れですが、CPU使用率が高くなる時間を抑えられます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/6f40b9ed-9e96-41c9-b9f6-c972517a7ca4)

このテコ入れでCPU使用率の問題はクリアできたように見えますが、また別の問題が浮上します。

## 生存期間の短いプロセスの取りこぼし

テコ入れ前のスクリプトとテコ入れ後のスクリプトを同時に実行してみると、テコ入れ前のスクリプトではキャッチできているプロセス情報がテコ入れ後のスクリプトではキャッチできないことがあります。

テコ入れ前

![image](https://github.com/r1k0t3k1/note/assets/57973603/5c71ee8b-6336-4b07-b428-1601940bd290)


テコ入れ後

![image](https://github.com/r1k0t3k1/note/assets/57973603/51bd7adf-f7dc-49c4-b5dd-b5f964cb14eb)

テコ入れ後のスクリプトでは`grep`などのプロセスがキャッチできていません。

ループ後のブロック中に起動され、ブロック中に生存期間が終了するプロセスはこの修正では拾えないことになります。

# pspyがこれらの問題点をどのように回避しているか

前の章で挙げた問題点をpspyは`Inotify API`というものを使用して回避しています。

Inotify APIはLinuxのファイルシステムイベントを監視するためのAPIです。

プロセスが起動する際は何かしらのファイルにアクセスするため、そのアクセスイベントをInotify APIを使用してキャッチし、それをトリガーとしてprocfsを列挙する、というのがpspyの基本的な仕組みです。

## Inotify API

上述の通りInotify APIはLinuxのファイルシステムイベントを監視するためのAPIです。

以下はman pageからの引用です。

> inotify API はファイルシステムイベントを監視するための機構を提供する。
inotify は個々のファイルやディレクトリを監視するのに使える。
ディレクトリを監視する場合、inotify はディレクトリ自身と ディレクトリ内のファイルのイベントを返す。 

Inotify APIを使用するには以下のシステムコールを使用します。

- inotify_init1
- inotify_add_watch
- read
- inotify_rm_watch(任意)

### inotify_init1

Inotify APIを使用するにはまず、`inotify_init1`を使用してInotify用のfdを初期化します。

`inotify_init1`には引数に`IN_CLOEXEC`か`IN_NONBLOCK`フラグを指定できますが、今回の用途では`IN_CLOEXEC`を指定します。理由は後述します。

```rust
extern "C" {
    pub fn inotify_init1(flags: i32) -> i32;
}

const IN_CLOEXEC: i32 = 524288;
//const IN_NONBLOCK: i32 = 2048;

fn main() {
    let fd = unsafe { inotify_init1(IN_CLOEXEC) };
}

```

### inotify_add_watch

続いて`inotify_add_watch`を使用して監視対象のファイルシステムを指定します。
第一引数に`inotify_init1`で取得したfd、第二引数に監視対象のパス、第三引数に監視するイベントマスクを指定します。

```rust
use std::ffi::CString;

extern "C" {
    pub fn inotify_init1(flags: i32) -> i32;
    pub fn inotify_add_watch(fd: i32, pathname: *const i8, mask: u32) -> i32;
}

const IN_CLOEXEC: i32 = 524288;
//const IN_NONBLOCK: i32 = 2048;
const IN_ALL_EVENTS: u32 = 4095;

fn main() {
    let fd = unsafe { inotify_init1(IN_NONBLOCK) };
    //let fd = unsafe { inotify_init1(IN_CLOEXEC) };
    let watch_fd = unsafe {
        inotify_add_watch(
            fd,
            CString::new("/opt/test").unwrap().as_ptr(),
            IN_ALL_EVENTS,
        )
    };
}

```

監視できるイベントは下記のとおりです。`IN_ALL_EVENTS`は全てのイベントを監視します。

```rust
IN_ACCESS = 0x1,
IN_MODIFY = 0x2,
IN_ATTRIB = 0x4,
IN_CLOSE_WRITE = 0x8,
IN_CLOSE_NOWRITE = 0x10,
IN_CLOSE = 0x8 | 0x10,
IN_OPEN = 0x20,
IN_MOVED_FROM = 0x40,
IN_MOVED_TO = 0x80,
IN_MOVE = 0x40 | 0x80,
IN_CREATE = 0x100,
IN_DELETE = 0x200,
IN_DELETE_SELF = 0x400,
IN_MOVE_SELF = 0x800,
```

### read

監視対象を設定できたら`inotify_init1`で取得したfdに対し、無限ループで`read`を呼び続けます。

このとき、`inotify_init1`で`IN_CLOEXEC`を指定したため、監視対象のイベントが発火するまで`read`がブロックします。

反対に`inotify_init1`で`IN_NONBLOCK`を指定した場合、`read`を呼んだタイミングで監視対象のイベントが発火していなかった場合、ブロックせず即、次の処理に進みます。

CPUの節約という目的の場合、イベント発火までブロックしてほしいので`IN_CLOEXEC`を指定しています。

最終的にInotify APIを使用するプログラム全体は下記のようになります。

このプログラムを実行し、`/opt/test`に文字列を書き込んで見るとイベントの発火を検知して文字列が出力されます。

```rust
use std::ffi::CString;

extern "C" {
    pub fn inotify_init1(flags: i32) -> i32;
    pub fn inotify_add_watch(fd: i32, pathname: *const i8, mask: u32) -> i32;
    pub fn read(fd: i32, buf: *mut u8, count: usize) -> isize;
}

const IN_CLOEXEC: i32 = 524288;
const IN_NONBLOCK: i32 = 2048;
const IN_ALL_EVENTS: u32 = 4095;

fn main() {
    let fd = unsafe { inotify_init1(IN_NONBLOCK) };
    //let fd = unsafe { inotify_init1(IN_CLOEXEC) };
    let watch_fd = unsafe {
        inotify_add_watch(
            fd,
            CString::new("/opt/test").unwrap().as_ptr(),
            IN_ALL_EVENTS,
        )
    };

    loop {
        let mut buf = [0_u8;1024];
        let _ = unsafe { read(fd, buf.as_mut_ptr() as *mut u8, buf.len()) };
        println!("Event fired!!");
    }
}

```

このプログラムは一つのディレクトリ(ファイル)を監視していますが、pspyは`/usr`,`/tmp`,`/etc`,`/home`,`/var`,`/opt`などのフォルダを再帰的に監視することでプロセスの起動をキャッチできる確率を高めています。

# 実装してみたリポジトリの紹介

ここまででpspyの仕組みが理解できているので、自分でpspyの機能を絞ったツールを作成してみました。

https://github.com/r1k0t3k1/thin-pspy

このツールを実行後、下記のような生存期間の短いプロセスを起動してみても…

![image](https://github.com/r1k0t3k1/note/assets/57973603/a9288c3d-3f83-45b8-970a-9261250f4475)

しっかりと補足できていることがわかります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/5c72e176-5bcc-4f37-a57e-d7935fcf5ffe)

また、CPU使用率を確認してみても、最大で10%、平均して6~7%ほどのCPU使用率に抑えられていることが確認できました。

![image](https://github.com/r1k0t3k1/note/assets/57973603/e32f2cb1-9f51-48d8-8e4a-9b8a88dfe9ba)

# まとめ

- プロセススパイはBoot2Rootなら簡単なPythonスクリプトでも十分。
- pspyはInotify APIを使用してプロセスの起動を検知している。
