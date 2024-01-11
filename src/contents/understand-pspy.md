---
title: "pspyを実装して理解する"
id: "pspy"
description: "pspyがどのようにプロセスを見ているかを解説します。"
author: "rikoteki"
createdAt: "2024-01-10"
isDraft: true
---

メモ(消す)

pspyの説明
pspyなしで同様のことをやるには
↑を行う際の問題点(CPU使用率)
↑を行う際の問題点(数秒おき実行でプロセスの取りこぼし)
pspyがこれらをどう解決しているか
実装してみた

# ToC

# pspyとは

Linuxにおけるプロセススパイのツールです。

https://github.com/DominicBreuker/pspy

主な用途は、カレントユーザー以外のユーザー権限で実行されているプロセスのコマンドラインを確認することです。

例えばカレントユーザー以外の権限で設定されたCronジョブが定期的に実行されている場合、`/var/spool/cron`以下に設定ファイルがあるとroot権限が無いとそれぞれの設定を読み取ることができませんが、pspyを対象ホスト上で実行することで定期実行されたプロセスのコマンドラインを確認することができます。

HackTheBoxなどのBoot2RootCTFの簡単な問題では、コマンドライン引数にクレデンシャルを設定しているプロセスがあって、権限昇格の手がかりになることがあります。

pspyは主に以下の仕組みを使用して実装されています。
また、効率的に実行プロセスを列挙するためにされている工夫がいくつかあるので併せて紹介してみたいと思います。

- procfs
- Inotify API

# procfs

`procfs`は`/proc`にマウントされているプロセス情報を管理しているファイルシステムです。

ファイルシステムと言ってもデータの実態はメモリ上に存在しており、procfsへのアクセスによるディスクアクセスは発生しません。

プロセス管理用のシステムコールを削減するために実装された仕組みのようです。


## /proc/[PID]

このディレクトリには`[PID]`のプロセスに関する情報が存在します。

![image](https://github.com/r1k0t3k1/note/assets/57973603/2d145b35-4f71-4ed8-bb16-e8acb26d8191)

新しくプロセスが実行された場合、そのプロセスのPIDでディレクトリが切られるため、このディレクトリを監視することで現在実行されているプロセスのPID一覧が取得できます。

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

ここまでの説明で、プロセスの監視をするなら`/proc`以下を無限ループで`/proc/[PID]`のディレクトリリストを取得してそれぞれの`/proc/[PID]/cmdline`を読み取ればpspyと同じことができるんじゃないかと思われた方もいるかと思います。

実際、そのとおりで下記のような簡単なプログラムでpspyと同様の処理が可能です。

ちなみにbashやPythonでも同様の処理を行うプログラムを書いてみましたが、実行速度が遅いせいなのか`/proc/[PID]`を列挙した後、`/proc/[PID]/cmdline`にアクセスしようとする瞬間にはプロセスが終了しており正常にコマンドラインを取得することができませんでした…

```rust

```

ただし、このプログラムには問題があります。

無限ループで絶え間なく処理を続けているため、実行中はCPU使用率が99%程度に張り付きます。

# Inotify API

# pspyに実装されている工夫

## procfsを無限ループで監視

## procfsをn秒毎に監視

# 実装してみたリポジトリの紹介
