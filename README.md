# PharmaMask — 藥局口罩平台

藥局口罩管理 REST API，含互動式前端介面。  
技術棧：Fastify 4 · PostgreSQL 16 · Prisma ORM · TypeScript · Vitest

---

## 一鍵啟動（Docker，推薦）

**前置需求：已安裝並啟動 [Docker Desktop](https://www.docker.com/products/docker-desktop/)**

```bash
git clone https://gitlab.com/think4u-internal/pharmamask.git
cd pharmamask
```

### Windows

```bat
start.bat
```

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

腳本會自動完成以下所有步驟，**完成後自動開啟瀏覽器**：

| 步驟 | 內容 |
|------|------|
| 1 | 啟動 PostgreSQL 16 容器 |
| 2 | `prisma migrate deploy` — 建立所有資料表與 Index |
| 3 | `npm run seed` — 匯入繁體中文假資料（藥局、口罩、使用者、購買歷史） |
| 4 | 啟動 Fastify API server |
| 5 | 偵測到 server 就緒後，自動開啟 http://localhost:3000 |

> 首次啟動需下載 Docker image 並初始化資料庫，約需 **30–60 秒**。  
> 之後再啟動因資料已存在（upsert 機制），速度更快。

---

### 已匯入的假資料

| 資料 | 數量 |
|------|------|
| 藥局 | 20 家（含繁體中文名稱、營業時間） |
| 口罩 | 95 種（含中文品牌名、顏色、包裝規格） |
| 使用者 | 20 人（含繁體中文姓名） |
| 購買歷史 | 101 筆（2024-12 ～ 2025-01） |

---

### 服務網址

| 服務 | 網址 |
|------|------|
| 前端介面 | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| API Health | http://localhost:3000/healthz |

---

### 停止服務

```bash
docker compose down
```

---

## 本地開發啟動

**前置需求：Node.js 20+、PostgreSQL 16**

```bash
# 1. Clone 專案
git clone https://gitlab.com/think4u-internal/pharmamask.git
cd pharmamask

# 2. 安裝依賴
npm install

# 3. 建立環境設定（預設連線 localhost:5432）
cp .env.example .env

# 4. 建立資料表
npx prisma migrate deploy

# 5. 匯入初始資料
npm run seed

# 6. 啟動開發 server（熱重載）
npm run dev
```

---

## 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=public` |
| `PORT` | Server 監聽 port | `3000` |
| `NODE_ENV` | 執行環境 | `development` |

完整範例請見 `.env.example`。

---

## API 端點

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/healthz` | Health check |
| GET | `/pharmacies` | 列出藥局（可加 `?day=Mon&time=14:00` 篩選營業中） |
| GET | `/pharmacies/:id/masks` | 藥局口罩列表（可加 `?sort=name\|price`） |
| GET | `/pharmacies/mask-count` | 依價格區間與口罩數量篩選藥局 |
| PUT | `/pharmacies/:id/masks` | 批次建立／更新口罩 |
| GET | `/users/top-spenders` | 消費排行榜（需帶 `?start=&end=`） |
| POST | `/purchases` | 購買交易（atomic transaction） |
| PATCH | `/masks/:id/stock` | 調整口罩庫存 |
| GET | `/search` | 全文搜尋藥局與口罩 |
| GET | `/docs` | Swagger UI 互動文件 |

---

## 測試

```bash
# 執行所有測試（60 個，不需 DB）
npm test

# 產生 coverage 報告
npm run test:coverage
```

Coverage 實際數值：
- `services/` → **95%**（目標 > 80%）
- `routes/`（integration）→ **75%**（目標 > 70%）

---

## 專案結構

```
pharmamask/
├── start.bat               # Windows 一鍵啟動腳本
├── start.sh                # macOS/Linux 一鍵啟動腳本
├── docker-compose.yml      # PostgreSQL + app（含自動 migrate & seed）
├── Dockerfile              # Multi-stage build
├── src/
│   ├── app.ts              # Fastify app factory
│   ├── server.ts           # 進入點
│   ├── routes/             # HTTP route handlers
│   ├── services/           # 商業邏輯層
│   ├── repositories/       # 資料存取層（Prisma）
│   ├── schemas/            # JSON Schema 驗證
│   └── public/
│       └── index.html      # 前端 SPA（RWD，純 HTML/CSS/JS）
├── prisma/
│   ├── schema.prisma       # 資料模型
│   ├── migrations/         # SQL migrations（含 GIN index）
│   └── seed/               # ETL 腳本
├── tests/
│   ├── unit/               # 單元測試（mock repository）
│   └── integration/        # 整合測試（Fastify inject）
├── data/
│   ├── pharmacies.json     # 藥局種子資料（繁體中文）
│   └── users.json          # 使用者種子資料（繁體中文）
├── .env.example
└── response.md             # 技術決策說明文件
```

---

## Tech Stack

- **Runtime** — Node.js 20 + TypeScript (ESM)
- **Framework** — Fastify 4
- **ORM** — Prisma 5（PostgreSQL 16）
- **Testing** — Vitest + `app.inject()`
- **Container** — Docker Compose
- **API Docs** — `@fastify/swagger-ui`
- **Security** — `@fastify/helmet`、`@fastify/rate-limit`
