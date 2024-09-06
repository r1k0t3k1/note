---
title: "HayabusaとElastic StackでWindowsイベントログ検証環境構築"
id: "hayabusa-windows-log-analysis"
description: "Hardening 2024に向けて"
author: "rikoteki"
createdAt: "2024-09-06"
isDraft: false
---

# HayabusaとElastic StackでWindowsイベントログ解析環境を構築

## Hayabusaのインストール

githubのMainリポジトリは安定版ではないらしいので[Release](https://github.com/Yamato-Security/hayabusa/releases)からアーキテクチャに合うバイナリをダウンロードする。

```bash
wget https://github.com/Yamato-Security/hayabusa/releases/download/v2.17.0/hayabusa-2.17.0-linux-intel.zip -O hayabusa.zip
unzip hayabusa.zip -d hayabusa/
rm hayabusa.zip
cd hayabusa
chmod +x hayabusa-*
```

実行が確認できればOK

![image](https://github.com/user-attachments/assets/bc15139f-368b-462b-b99b-7ba2cc11509b)

## Elastic Stackのインストール

公式ページを参考にファイルを作成する

https://www.elastic.co/jp/blog/getting-started-with-the-elastic-stack-and-docker-compose

ディレクトリ構成は以下

```
.
├── .env
└── docker-compose.yml
```

`.env`の編集

公式ページからコピペして`changeme`部分を適当に編集

`ENCRYPTION_KEY`も公開前提なら変えたほうがいいかも

```
# Project namespace (defaults to the current folder name if not set)
#COMPOSE_PROJECT_NAME=myproject
# Password for the 'elastic' user (at least 6 characters)
ELASTIC_PASSWORD=changeme
# Password for the 'kibana_system' user (at least 6 characters)
KIBANA_PASSWORD=changeme
# Version of Elastic products
STACK_VERSION=8.7.1
# Set the cluster name
CLUSTER_NAME=docker-cluster
# Set to 'basic' or 'trial' to automatically start the 30-day trial
LICENSE=basic
#LICENSE=trial

# Port to expose Elasticsearch HTTP API to the host
ES_PORT=9200
# Port to expose Kibana to the host
KIBANA_PORT=5601
# Increase or decrease based on the available host memory (in bytes)
ES_MEM_LIMIT=1073741824
KB_MEM_LIMIT=1073741824
LS_MEM_LIMIT=1073741824
# SAMPLE Predefined Key only to be used in POC environments
ENCRYPTION_KEY=c34d38b3a14956121ff2170e5030b471551370178f43e5626eec58b04a30fae2
```

`docker-compose.yml`も公式からコピペ

```yml
version: "3.8"


volumes:
 certs:
   driver: local
 esdata01:
   driver: local
 kibanadata:
   driver: local
 metricbeatdata01:
   driver: local
 filebeatdata01:
   driver: local
 logstashdata01:
   driver: local


networks:
 default:
   name: elastic
   external: false


services:
 setup:
   image: docker.elastic.co/elasticsearch/elasticsearch:${STACK_VERSION}
   volumes:
     - certs:/usr/share/elasticsearch/config/certs
   user: "0"
   command: >
     bash -c '
       if [ x${ELASTIC_PASSWORD} == x ]; then
         echo "Set the ELASTIC_PASSWORD environment variable in the .env file";
         exit 1;
       elif [ x${KIBANA_PASSWORD} == x ]; then
         echo "Set the KIBANA_PASSWORD environment variable in the .env file";
         exit 1;
       fi;
       if [ ! -f config/certs/ca.zip ]; then
         echo "Creating CA";
         bin/elasticsearch-certutil ca --silent --pem -out config/certs/ca.zip;
         unzip config/certs/ca.zip -d config/certs;
       fi;
       if [ ! -f config/certs/certs.zip ]; then
         echo "Creating certs";
         echo -ne \
         "instances:\n"\
         "  - name: es01\n"\
         "    dns:\n"\
         "      - es01\n"\
         "      - localhost\n"\
         "    ip:\n"\
         "      - 127.0.0.1\n"\
         "  - name: kibana\n"\
         "    dns:\n"\
         "      - kibana\n"\
         "      - localhost\n"\
         "    ip:\n"\
         "      - 127.0.0.1\n"\
         > config/certs/instances.yml;
         bin/elasticsearch-certutil cert --silent --pem -out config/certs/certs.zip --in config/certs/instances.yml --ca-cert config/certs/ca/ca.crt --ca-key config/certs/ca/ca.key;
         unzip config/certs/certs.zip -d config/certs;
       fi;
       echo "Setting file permissions"
       chown -R root:root config/certs;
       find . -type d -exec chmod 750 \{\} \;;
       find . -type f -exec chmod 640 \{\} \;;
       echo "Waiting for Elasticsearch availability";
       until curl -s --cacert config/certs/ca/ca.crt https://es01:9200 | grep -q "missing authentication credentials"; do sleep 30; done;
       echo "Setting kibana_system password";
       until curl -s -X POST --cacert config/certs/ca/ca.crt -u "elastic:${ELASTIC_PASSWORD}" -H "Content-Type: application/json" https://es01:9200/_security/user/kibana_system/_password -d "{\"password\":\"${KIBANA_PASSWORD}\"}" | grep -q "^{}"; do sleep 10; done;
       echo "All done!";
     '
   healthcheck:
     test: ["CMD-SHELL", "[ -f config/certs/es01/es01.crt ]"]
     interval: 1s
     timeout: 5s
     retries: 120

 es01:
   depends_on:
     setup:
       condition: service_healthy
   image: docker.elastic.co/elasticsearch/elasticsearch:${STACK_VERSION}
   labels:
     co.elastic.logs/module: elasticsearch
   volumes:
     - certs:/usr/share/elasticsearch/config/certs
     - esdata01:/usr/share/elasticsearch/data
   ports:
     - ${ES_PORT}:9200
   environment:
     - node.name=es01
     - cluster.name=${CLUSTER_NAME}
     - discovery.type=single-node
     - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
     - bootstrap.memory_lock=true
     - xpack.security.enabled=true
     - xpack.security.http.ssl.enabled=true
     - xpack.security.http.ssl.key=certs/es01/es01.key
     - xpack.security.http.ssl.certificate=certs/es01/es01.crt
     - xpack.security.http.ssl.certificate_authorities=certs/ca/ca.crt
     - xpack.security.transport.ssl.enabled=true
     - xpack.security.transport.ssl.key=certs/es01/es01.key
     - xpack.security.transport.ssl.certificate=certs/es01/es01.crt
     - xpack.security.transport.ssl.certificate_authorities=certs/ca/ca.crt
     - xpack.security.transport.ssl.verification_mode=certificate
     - xpack.license.self_generated.type=${LICENSE}
   mem_limit: ${ES_MEM_LIMIT}
   ulimits:
     memlock:
       soft: -1
       hard: -1
   healthcheck:
     test:
       [
         "CMD-SHELL",
         "curl -s --cacert config/certs/ca/ca.crt https://localhost:9200 | grep -q 'missing authentication credentials'",
       ]
     interval: 10s
     timeout: 10s
     retries: 120

kibana:
   depends_on:
     es01:
       condition: service_healthy
   image: docker.elastic.co/kibana/kibana:${STACK_VERSION}
   labels:
     co.elastic.logs/module: kibana
   volumes:
     - certs:/usr/share/kibana/config/certs
     - kibanadata:/usr/share/kibana/data
   ports:
     - ${KIBANA_PORT}:5601
   environment:
     - SERVERNAME=kibana
     - ELASTICSEARCH_HOSTS=https://es01:9200
     - ELASTICSEARCH_USERNAME=kibana_system
     - ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}
     - ELASTICSEARCH_SSL_CERTIFICATEAUTHORITIES=config/certs/ca/ca.crt
     - XPACK_SECURITY_ENCRYPTIONKEY=${ENCRYPTION_KEY}
     - XPACK_ENCRYPTEDSAVEDOBJECTS_ENCRYPTIONKEY=${ENCRYPTION_KEY}
     - XPACK_REPORTING_ENCRYPTIONKEY=${ENCRYPTION_KEY}
   mem_limit: ${KB_MEM_LIMIT}
   healthcheck:
     test:
       [
         "CMD-SHELL",
         "curl -s -I http://localhost:5601 | grep -q 'HTTP/1.1 302 Found'",
       ]
     interval: 10s
     timeout: 10s
     retries: 120
```

コンテナを立ち上げる

```bash
docker compose up 
```

http://localhost:5601にアクセスしてログインページが表示されればOK

![image](https://github.com/user-attachments/assets/7b91265e-ea5e-4e72-8b6f-0160878a4948)

初期ユーザは`elastic`、パスワードは`.env`に指定したものでログインできればOK

![image](https://github.com/user-attachments/assets/e8029e0a-a733-4160-a95d-0122dddcb939)

## HayabusaでサンプルEVTXを解析する

Hayabusaプロジェクトは解析用のサンプルEVTXを提供している

https://github.com/Yamato-Security/hayabusa-sample-evtx/tree/main

今回はこのリポジトリを使用するためCloneする

```bash
git clone https://github.com/Yamato-Security/hayabusa-sample-evtx.git
cd hayabusa-sample-evtx
```

Hayabusaで解析結果CSVを出力する

Hayabusaのバイナリがあるディレクトリから実行しないといけないらしい

```bash
./hayabusa-2.17.0-lin-x64-gnu csv-timeline --directory ../elastic/hayabusa-sample-evtx/ --output timeline.csv
```

今回読み込むルールセットは`Core+`を選択した

![image](https://github.com/user-attachments/assets/3e549aca-d8dd-43e2-85a8-d58336fcc525)

sysmonルールを含めるかの質問はデフォルトのYesを選択

```
? Include sysmon rules? (2,858 rules) (y/n) › yes
```

コマンド実行が終了するとCSVファイルが作成される

```
-rw-rw-r-- 1 rikoteki rikoteki  12M Sep  6 21:54 timeline.csv
```

標準出力にもサマリが表示される

![image](https://github.com/user-attachments/assets/62e43b64-3c57-44a7-b37c-ee8cf37f3e42)

## Hayabusa解析結果をKibanaにインポートする

ハンバーガーメニューから`Integrations`を選択

![image](https://github.com/user-attachments/assets/83915c03-8ffb-44b9-b2f0-ea92b80a1fe4)

検索窓に`Upload`と入力し`Upload a file`を選択

![image](https://github.com/user-attachments/assets/1e68277a-2c13-421f-aa63-77d8a055ee14)

CSVファイルをアップロードして`Import`を選択

![image](https://github.com/user-attachments/assets/c7f6f472-96ab-4d11-b17e-34537c2b4665)

`Advanced`の各設定を以下のように変更する

Index name

`evtxlogs-hayabusa`

Index settings

```json
{
  "number_of_shards": 1,
  "number_of_replicas": 0
}
```
  
Mappings

```json
{
  "properties": {
    "Channel": {
      "type": "keyword"
    },
    "Computer": {
      "type": "keyword"
    },
    "Details": {
      "type": "text"
    },
    "EventID": {
      "type": "long"
    },
    "ExtraFieldInfo": {
      "type": "text"
    },
    "Level": {
      "type": "keyword"
    },
    "RecordID": {
      "type": "long"
    },
    "RuleTitle": {
      "type": "text"
    },
    "Timestamp": {
      "type": "keyword"
    }
  }
}
```

Ingest pipeline

```json
{
  "description": "Ingest pipeline created by text structure finder",
  "processors": [
    {
      "csv": {
        "field": "message",
        "target_fields": [
          "Timestamp",
          "RuleTitle",
          "Level",
          "Computer",
          "Channel",
          "EventID",
          "RecordID",
          "Details",
          "ExtraFieldInfo"
        ],
        "ignore_missing": false
      }
    },
    {
      "convert": {
        "field": "RecordID",
        "type": "long",
        "ignore_missing": true
      }
    },
    {
      "remove": {
        "field": "message",
        "field": "Timestamp"
      }
    }
  ]
}
```

`Import`を選択して`Import complete`が表示されればインポート成功

![image](https://github.com/user-attachments/assets/b0e1e2a3-791f-432a-86d8-8b3edcfd7656)

## Hayabusaダッシュボードの設定

以下に提供されているJSONをダウンロードする

https://github.com/Yamato-Security/hayabusa/blob/main/doc/ElasticStackImport/HayabusaDashboard.ndjson

Kibanaのハンバーガーメニューから`Stack management`を選択

![image](https://github.com/user-attachments/assets/385ff2f3-6075-4396-a91d-20b8eabf6e82)

`Saved Objects`から`Import`でダウンロードしたJSONをアップロードする

![image](https://github.com/user-attachments/assets/647d9ee2-1b48-4b88-b64e-7e3025894816)

成功すると以下のようなダッシュボードが利用できるようになる

![image](https://github.com/user-attachments/assets/8fca0ea3-7683-430c-8ea3-4c84b1b53faf)

画面中程にはルールのリスクごと検出件数TOP10が参照できる

![image](https://github.com/user-attachments/assets/913257eb-be9d-4047-aa0a-7dd1ecd7cb8e)

