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

## 全面分析報告修正記錄

依「系統分析師 / 測試工程師 / 架構師」三視角分析報告，共 28 項問題，**22 項已修正，5 項評估後保留**。

### ✅ 已修正（22 項）

| # | 視角 | 問題 | 修正內容 |
|---|------|------|---------|
| 系統 #1 | 系統分析 | 完全無身分驗證，任意 userId 可消費他人餘額 | 新增 JWT 認證層；`POST /auth/token` 取得 token；購買／庫存調整／口罩 upsert 需帶 `Authorization: Bearer` |
| 系統 #2 | 系統分析 | 浮點數金錢計算（`Number * quantity`）有精度誤差 | 全面改用 `Prisma.Decimal` 四則運算，財務計算不經 float |
| 系統 #3 | 系統分析 | 重複 maskId 各自通過庫存檢查但合計超賣 | 購買前用 `Map` 合併相同 maskId 的數量，再統一做庫存驗證 |
| 系統 #5 | 系統分析 | `day=Mon`（無 time）回傳全部藥局 | 新增 `findPharmaciesOpenOnDay`，只傳 day 時改查有該日營業時段的藥局 |
| 系統 #6 | 系統分析 | 列表 API 無分頁，大資料量一次回傳全部 | 所有列表端點統一加入 `{ data, pagination: { page, pageSize, total, totalPages } }` |
| 系統 #7 | 系統分析 | 日期時區假設不一致（start 用本機時區、end 硬寫 UTC） | 起訖時間均明確使用 UTC：`new Date(start + 'T00:00:00.000Z')` / `new Date(end + 'T23:59:59.999Z')` |
| 系統 #8 | 系統分析 | `cashBalance` 財務欄位公開暴露在藥局列表 | 所有公開 API 的 Prisma select 移除 `cashBalance` |
| 測試 #1 | 測試工程 | `buildTxMock` 定義後從未呼叫（死碼） | 移除死碼，保持測試檔案整潔 |
| 測試 #2 | 測試工程 | Mock 型別用 `number`，無法覆蓋 `Prisma.Decimal` 精度問題 | 全部改為 `new Prisma.Decimal('15.00')`，型別與生產一致 |
| 測試 #5 | 測試工程 | 無重複 maskId 超賣情境測試 | 新增整合測試：`[{ maskId, qty:2 }, { maskId, qty:3 }]` 庫存 4 應回傳 422 |
| 測試 #6 | 測試工程 | 搜尋特殊字元（`&`、`!`、`|`）無測試 | 新增整合測試：傳入 `%26`、`%7C` 等特殊字元應正常回傳 200 |
| 測試 #7 | 測試工程 | `truncateAll` 5 個 deleteMany 非原子，中途失敗殘留髒資料 | 改為 `prisma.$transaction([...deleteMany()])` 原子執行 |
| 架構 #2 | 架構 | 所有 `throw` 用 `const err: any = new Error(); err.statusCode=xxx`，型別不安全 | 新增 `src/errors.ts`：`AppError` → `NotFoundError(404)` / `ValidationError(400)` / `InsufficientError(422)` |
| 架構 #3 | 架構 | `maskService.adjustStock` TOCTOU 競態：樂觀鎖失敗回未處理的 500 | 捕捉 Prisma `P2025`（RecordNotFound）轉換為 `InsufficientError`（422） |
| 架構 #5 | 架構 | `time && !day` 驗證同時出現在 route 層與 service 層（違反 DRY） | 移除 route 層重複判斷，保留 service 層單一責任 |
| 架構 #6 | 架構 | Dockerfile 生產環境用 `tsx`（開發工具），有額外效能開銷 | 改為 multi-stage build：builder 執行 `tsc`，runner 以 `node dist/server.js` 啟動 |
| 架構 #7 | 架構 | `helmet({ contentSecurityPolicy: false })` 完全關閉 XSS 防護 | 啟用 CSP：`defaultSrc: ["'self'"]`，移除 `false` 覆寫 |
| 架構 #9 | 架構 | `docker-compose.yml` 硬編碼 `POSTGRES_PASSWORD: postgres` | 改為 `${POSTGRES_PASSWORD:?...}` 與 `${JWT_SECRET:?...}`，未設定環境變數時啟動失敗並提示 |
| 架構 #10 | 架構 | Seed 巢狀迴圈逐筆 `findUnique`（N+1 問題） | 改為批次 `findMany` 後建立 `Map`，所有關聯查找改為 O(1) Map lookup |

### ❌ 評估後保留（5 項）

| # | 視角 | 問題 | 保留原因 |
|---|------|------|---------|
| 系統 #4 | 系統分析 | Seed 直接寫 `PurchaseHistory`，餘額不反映歷史交易 | 原始 JSON 中 `cashBalance` 已是所有交易後的最終值；若走服務層會對初始餘額雙重扣款，造成反而不一致 |
| 測試 #3 | 測試工程 | 無真正並發競態測試（兩 TX 同時搶最後一件庫存） | 樂觀鎖（P2025）已防止超賣；真正的並發測試需 `pg_advisory_lock` 或外部壓測工具，超出單元/整合測試範疇 |
| 測試 #4 | 測試工程 | Repository 層無獨立單元測試 | Repository 的 FTS 查詢與 HAVING 條件已由整合測試（真實 DB）完整覆蓋，重複撰寫 mock 測試價值低 |
| 架構 #1 | 架構 | Global Prisma Singleton 違反依賴注入原則 | Prisma 官方文件推薦單例避免連線池耗盡；引入 DI 容器（如 `tsyringe`）會增加架構複雜度，超出當前需求 |
| 架構 #4 | 架構 | Repository 無 TypeScript 介面定義 | TypeScript 結構型別（structural typing）已提供足夠的型別約束；加介面為純重構，不影響行為正確性 |

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
| `JWT_SECRET` | JWT 簽名金鑰（生產環境必填） | — |
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
# 單元測試（39 個，不需 DB）
npm test

# 整合測試（47 個，需 PostgreSQL）
npm run test:integration

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
