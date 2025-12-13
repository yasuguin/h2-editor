import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// CORS設定（開発環境のみ）
if (process.env.NODE_ENV !== "production") {
  app.use(
    "/*",
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );
}

// ヘルスチェックエンドポイント
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// 静的ファイル配信（本番環境のみ）
if (process.env.NODE_ENV === "production") {
  app.use(
    "/*",
    serveStatic({
      root: "./dist",
    })
  );

  // SPA フォールバック: 静的ファイルが見つからない場合は index.html を返す
  app.get(
    "/*",
    serveStatic({
      path: "./dist/index.html",
    })
  );
}

const port = Number(process.env.PORT) || 3000;

console.log(`Hono server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});
