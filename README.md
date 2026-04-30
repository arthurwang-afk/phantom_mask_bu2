# PharmaMask — 藥局口罩平台

藥局口罩管理 REST API，含互動式前端介面。  
技術棧：Fastify 4 · PostgreSQL 16 · Prisma ORM · TypeScript · Vitest

---

## 原專案需求完成度

原始需求來源：[kdan-mobile-software-ltd/phantom_mask_bu2](https://github.com/kdan-mobile-software-ltd/phantom_mask_bu2)

| 類別 | 項目 | 狀態 | 實作說明 |
|------|------|:----:|---------|
| **A. 原始資料** | 讀取 `pharmacies.json`（藥局名稱、營業時間、現金餘額、口罩商品） | ✅ | `prisma/seed/index.ts` 解析並清理原始字串格式後 upsert 至 DB |
| | 讀取 `users.json`（使用者名稱、現金餘額、購買紀錄） | ✅ | 同上，含購買歷史時間與金額格式轉換 |
| | ETL 清理（時間字串解析、價格格式、日期正規化） | ✅ | 種子腳本自行處理所有 raw data 清理，冪等執行不產生重複資料 |
| **B. 8 個功能** | 列出藥局，可依時間／星期篩選 | ✅ | `GET /pharmacies?day=Mon&time=14:00`，`PharmacyHours` 正規化表 + SQL `WHERE`，正確處理跨午夜時段 |
| | 列出某藥局口罩，可依名稱或價格排序 | ✅ | `GET /pharmacies/:id/masks?sort=name\|price` |
| | 依價格區間與口罩數量門檻篩選藥局（above / below / between） | ✅ | `GET /pharmacies/mask-count?minPrice=10&maxPrice=50&countMin=3&countMax=10`；`COUNT` + `HAVING`；僅填 `countMin` → 大於，僅填 `countMax` → 小於，兩者都填 → 介於之間 |
| | 特定日期區間消費最高前 N 名使用者 | ✅ | `GET /users/top-spenders?start=2024-12-01&end=2025-01-31&limit=10`；`SUM(total_price)` 聚合 |
| | 使用者一次從多個藥局購買口罩 | ✅ | `POST /purchases`；Prisma `$transaction` 確保多藥局庫存扣減、使用者扣款、藥局入帳原子執行，任一失敗全部回滾 |
| | 更新口罩庫存數量（增加或減少） | ✅ | `PATCH /masks/:id/stock`；支援正負 delta；庫存不足回傳 422 |
| | 批次建立或更新藥局口罩（名稱、價格、庫存） | ✅ | `PATCH /pharmacies/:id/masks`；以藥局 ID + 口罩名稱為 unique key upsert，清單外口罩保留不動 |
| | 搜尋藥局或口罩名稱，依相關性排序 | ✅ | `GET /search?q=棉護`；PostgreSQL `to_tsvector` + `ts_rank` + GIN 索引；`ILIKE` 作為繁體中文後備 |
| **C. 交付物** | 完整 API 文件（path、method、request params、response 範例、error format） | ✅ | Swagger UI：`http://localhost:3000/docs` |
| | ETL 腳本執行指令 | ✅ | `npm run seed` |
| | Server + DB 啟動指令 | ✅ | `docker compose up -d` 或 `npm run dev` |
| | 本地部署說明（Docker） | ✅ | 詳見下方「一鍵啟動」章節 |
| | `response.md` 自我介紹與技術說明 | ✅ | [response.md](./response.md) |
| **D. 評審重點** | 需求完整度 — 8 個 API 全部實作 | ✅ | 見上方 B 區塊 |
| | 資料庫設計 — 正規化、index、migration、rollback | ✅ | `PharmacyHours` 獨立表；GIN index；`prisma/migrations/` 管理；每個 migration 附 `down.sql` 支援回滾 |
| | API 設計 — 符合真實場景、RESTful 語意正確 | ✅ | upsert 用 `PATCH` 非 `PUT`；庫存不足 422；資源不存在 404；統一錯誤格式 |
| | 架構 — 符合框架設計模式，不重造輪子 | ✅ | 三層架構 `routes` → `services` → `repositories`；Fastify plugin；Prisma ORM |
| | 程式碼品質 — 可讀性、效能、可維護性、錯誤處理 | ✅ | TypeScript 全型別；避免 N+1 query；服務層與路由層分離 |
| | 安全性 — OWASP Top 10、防 SQLi/XSS/CSRF、不 hardcode 金鑰 | ✅ | Prisma prepared statements 防 SQLi；`@fastify/helmet` 防 XSS；純 REST + JSON 無 cookie session（CSRF 不適用）；`@fastify/rate-limit` 限流；金鑰透過 `.env` 管理 |
| | 單元測試 — 涵蓋成功與失敗情境，有 coverage report | ✅ | 79 個測試（38 單元 + 41 整合）；`services/` ~95%、`routes/` ~75%；`npm run test:coverage` |
| | 部署 — Docker / docker-compose | ✅ | `docker compose up -d` 一鍵啟動，自動 migrate + seed + 啟動 server |
| | API 文件 — 每個 endpoint 含完整規格與範例 | ✅ | Swagger UI 含 request params、response schema、error codes |

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
| PATCH | `/pharmacies/:id/masks` | 批次建立／更新口罩 |
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
