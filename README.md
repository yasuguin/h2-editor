<!-- @format -->

# H2 editor

水素のように軽いコード／Markdown エディタ。
H2 は「軽さ（H₂）」と「見出し（Markdown の h2）」のダブルミーニング。
ブラウザだけで動作し、編集データはローカルに留まります。

詳しい解説は [note の記事](https://note.com/yasu_dev/n/nffa94b81f230?sub_rt=share_pb) を参照してください。

## ユーザー向け

- Monaco ベースのエディタ（JetBrains Mono、ミニマップ、スムーズスクロール）
- ビュー切替: Edit / Split（プレビュー併設） / View（Markdown ブロックエディタ）
- Markdown 整形ボタン: Bold / Strike / Highlight / InlineCode / CodeBlock / Link / Checklist
- Undo / Redo / Copy / Download（言語に応じた拡張子） / Save（localStorage）
- 言語モード選択＋自動検出、エンコーディング表示、テーマファミリー＋ライト/ダーク切替
- ステータスバー: カーソル位置、文字数（選択/総数）、言語・エンコーディング・テーマ表示
- タスクチェックやリストの行操作に対応する Markdown プレビュー＆ブロックエディタ

## 開発者向け

```bash
# 依存関係インストール
pnpm i

# 開発サーバー起動
# http://localhost:5173 でフロント、http://localhost:3000 で Hono
pnpm dev

# Cloud Run へデプロイ
gcloud builds submit --config=cloudbuild.yaml
```

## ライセンス

MIT
