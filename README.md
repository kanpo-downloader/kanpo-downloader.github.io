# 官報ダウンローダー

官報ファイルを年別にダウンロードできる静的Webサイトです。

## 機能

- 2025年以降の年を選択してファイル一覧を表示
- GitHub APIからリアルタイムでファイル情報を取得
- 日付別にファイルをグルーピング表示
- 各ファイルのサイズを表示
- レスポンシブデザインでモバイル対応
- GitHub Pagesでホスト

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- GitHub Pages

## 開発環境のセットアップ

1. 依存関係をインストール:
```bash
npm install
```

2. 開発サーバーを起動:
```bash
npm run dev
```

3. ブラウザで http://localhost:3000 を開く

## ビルドとデプロイ

1. 静的ファイルをビルド:
```bash
npm run build
```

2. GitHub Pagesにデプロイ:
- mainブランチにプッシュすると自動的にデプロイされます
- GitHub Actionsがビルドとデプロイを実行します

## ファイル構成

```
src/
├── app/
│   ├── globals.css      # グローバルスタイル
│   ├── layout.tsx       # ルートレイアウト
│   └── page.tsx         # メインページ
├── components/          # 再利用可能なコンポーネント
└── data/               # ファイルデータ
```

## カスタマイズ

### ファイルデータの追加

ファイルデータはGitHub APIから自動的に取得されます。各年のリポジトリ（`kanpo-{year}`）にPDFファイルを追加することで、自動的にサイトに反映されます。

### スタイルの変更

Tailwind CSSクラスを使用してスタイルをカスタマイズできます。

## API仕様

このサイトは以下のGitHub APIを使用しています：

- **ファイル一覧取得**: `https://api.github.com/repos/kanpo-downloader/kanpo-{year}/git/trees/main?recursive=1`
- **ダウンロードURL**: `https://raw.githubusercontent.com/kanpo-downloader/kanpo-{year}/refs/heads/main/{path}`

## ライセンス

MIT License