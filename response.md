# 回覆文件

## 自我介紹

您好，我是一名有多年後端開發經驗的全端工程師，熟悉 Node.js / TypeScript 生態系、PostgreSQL 資料庫設計，以及 RESTful API 架構。

這次的 PharmaMask 專案，我選擇以 **Fastify 4 + Prisma 5 + PostgreSQL 16 + TypeScript（ESM）** 為核心技術棧，並以 **Docker Compose** 實現一鍵部署。在開發過程中，我特別注意以下幾點：

- **資料正規化**：將藥局營業時間獨立成 `PharmacyHours` 表，方便以 SQL `WHERE` 條件做時段篩選，並正確處理跨午夜的營業時段。
- **交易原子性**：購買流程採用 Prisma `$transaction` 確保庫存扣減、使用者餘額扣款、藥局收款三個步驟同時成功或同時回滾。
- **搜尋品質**：結合 PostgreSQL `to_tsvector` + GIN 索引做全文搜尋，並加上 `ILIKE` 作為繁體中文字元的後備方案，保證搜尋結果依相關性排序。
- **測試完整性**：撰寫 79 個測試（38 個單元測試 + 41 個整合測試），整合測試採用獨立的 PostgreSQL schema（`schema=test`）避免污染開發資料。
- **安全性**：使用 `@fastify/helmet` 設置安全標頭，並以 `@fastify/rate-limit` 限制每分鐘 100 次請求，防止濫用。

---

## 需求完成度

- [x] 列出藥局，可依指定時間與星期幾篩選。
  - 實作於 `GET /pharmacies?day=Mon&time=14:00`
- [x] 列出指定藥局販售的所有口罩，可依名稱或價格排序。
  - 實作於 `GET /pharmacies/:id/masks?sort=name|price`
- [x] 列出在指定價格區間內提供特定數量口罩商品的所有藥局，數量條件可為大於、小於或介於給定的閾值之間。
  - 實作於 `GET /pharmacies/mask-count?minPrice=10&maxPrice=50&countMin=3&countMax=10`
- [x] 顯示在特定日期區間內消費金額最高的前 N 名使用者。
  - 實作於 `GET /users/top-spenders?start=2024-12-01&end=2025-01-31&limit=10`
- [x] 處理購買交易，允許使用者一次從多家藥局購買口罩。
  - 實作於 `POST /purchases`
- [x] 更新現有口罩商品的庫存數量（可增加或減少）。
  - 實作於 `PATCH /masks/:id/stock`
- [x] 一次批次建立或更新藥局的多個口罩商品（含名稱、價格、庫存數量）。
  - 實作於 `PATCH /pharmacies/:id/masks`
- [x] 依名稱搜尋藥局或口罩，並依與搜尋詞的相關性排序結果。
  - 實作於 `GET /search?q=棉護`

---

## API 文件

啟動後可在 **`http://localhost:3000/docs`** 開啟互動式 Swagger UI。每個端點均記錄其路徑、方法、請求參數、回應 Schema（含範例）及錯誤代碼。

### 端點總覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/healthz` | 健康檢查 |
| GET | `/pharmacies` | 列出藥局。Query：`day`（Mon/Tue/…）、`time`（HH:MM） |
| GET | `/pharmacies/:id/masks` | 列出藥局的口罩。Query：`sort=name\|price` |
| GET | `/pharmacies/mask-count` | 依價格區間與口罩數量篩選藥局。Query：`minPrice`*、`maxPrice`* 、`countMin`、`countMax` |
| PATCH | `/pharmacies/:id/masks` | 批次建立／更新口罩 |
| GET | `/users/top-spenders` | 消費排行榜。Query：`start`*、`end`*（YYYY-MM-DD）、`limit`（預設 10） |
| POST | `/purchases` | 原子性購買交易 |
| PATCH | `/masks/:id/stock` | 調整口罩庫存 |
| GET | `/search` | 依名稱搜尋並依相關性排序。Query：`q`* |

`*` = 必填

### 錯誤回應格式

所有錯誤均採用統一格式：

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Insufficient stock for mask id 3"
}
```

| 代碼 | 含義 | 觸發範例 |
|------|------|----------|
| 400 | Bad Request | 缺少必填參數、格式錯誤、空陣列 |
| 404 | Not Found | 藥局 / 口罩 / 使用者不存在 |
| 422 | Unprocessable Entity | 餘額不足或庫存不足 |

---

## 資料匯入指令

### Docker（推薦——每次啟動自動執行）

```bash
docker compose up -d
# migrate + seed 會在容器啟動時自動執行
```

### 本地端

```bash
# 套用資料庫 Schema migrations
npx prisma migrate deploy

# 匯入藥局與使用者種子資料（冪等——可安全重複執行）
npm run seed
```

種子腳本（`prisma/seed/index.ts`）讀取 `data/pharmacies.json` 與 `data/users.json`，解析並清理資料（營業時間、價格格式、日期字串），再透過 `prisma.$transaction` 以原子方式 upsert 所有記錄。

已匯入的資料：

| 資料集 | 筆數 |
|--------|------|
| 藥局 | 20 家（含營業時間） |
| 口罩 | 95 種 |
| 使用者 | 20 人 |
| 購買歷史 | 101 筆（2024-12 ～ 2025-01） |

---

## 測試覆蓋率報告

共撰寫 79 個測試，涵蓋所有主要成功與失敗情境。

```bash
# 單元測試——不需要資料庫（38 個測試）
npm test

# 整合測試——需要執行中的 PostgreSQL（41 個測試）
npm run test:integration

# 全部測試
npm run test:all

# 產生覆蓋率報告
npm run test:coverage
```

| 層級 | 測試數 | 覆蓋率 |
|------|--------|--------|
| `services/` 單元測試 | 38 | ~95% |
| `routes/` 整合測試（真實 DB） | 41 | ~75% |

覆蓋率目標：`services/` > 80% ✅ · `routes/` > 70% ✅

---

## 部署方式

### Docker（一鍵啟動）

**前置需求：** 已安裝並啟動 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
git clone https://gitlab.com/think4u-internal/pharmamask.git
cd pharmamask
```

**Windows：**
```bat
start.bat
```

**macOS / Linux：**
```bash
chmod +x start.sh
./start.sh
```

腳本會自動完成：啟動 PostgreSQL 16 → 執行 `prisma migrate deploy` → 匯入種子資料 → 啟動 Fastify server → 偵測到 server 就緒後自動開啟瀏覽器。

| 服務 | 網址 |
|------|------|
| 前端 SPA | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| 健康檢查 | http://localhost:3000/healthz |

```bash
# 停止所有服務
docker compose down
```

### 本地開發（不使用 Docker）

**前置需求：** Node.js 20+、PostgreSQL 16

```bash
npm install
cp .env.example .env        # 如需修改請編輯 DATABASE_URL
npx prisma migrate deploy
npm run seed
npm run dev                 # 熱重載開發 server，埠號 3000
```

### 環境變數

> 所有機密資訊均透過環境變數管理。`.env` 已排除於版本控制之外，原始碼中無任何硬編碼的機密資訊。

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=public` |
| `PORT` | Server 監聽埠號 | `3000` |
| `NODE_ENV` | 執行環境 | `development` |

完整範例請見 `.env.example`。

---

## 補充資料

### 實體關係圖（ERD）

```mermaid
erDiagram
    Pharmacy ||--o{ PharmacyHours : has
    Pharmacy ||--o{ Mask : sells
    Pharmacy ||--o{ PurchaseHistory : receives
    User ||--o{ PurchaseHistory : makes
    Mask ||--o{ PurchaseHistory : included_in

    Pharmacy {
        int id PK
        string name UK
        decimal cash_balance
    }
    PharmacyHours {
        int id PK
        int pharmacy_id FK
        string day_of_week
        string open_time
        string close_time
    }
    Mask {
        int id PK
        int pharmacy_id FK
        string name
        decimal price
        int stock_quantity
    }
    User {
        int id PK
        string name UK
        decimal cash_balance
    }
    PurchaseHistory {
        int id PK
        int user_id FK
        int pharmacy_id FK
        int mask_id FK
        string mask_name
        int quantity
        decimal total_price
        datetime transaction_date
    }
```

### 主要設計決策

**Migration 回滾策略**

每個 migration 資料夾同時包含 `migration.sql`（正向）與 `down.sql`（回滾）。回滾初始 schema 的方式：

```bash
# 直接透過 psql 執行 down.sql
psql $DATABASE_URL -f prisma/migrations/20240101000000_init/down.sql

# 或透過 Docker
docker compose exec postgres psql -U postgres phantom_mask \
  -f /app/prisma/migrations/20240101000000_init/down.sql
```

未來每次新增 migration，都會同步提供對應的 `down.sql`，確保每個版本都能乾淨地回滾。

**為何將營業時間正規化為獨立資料表？**

原始 JSON 將時間以字串形式儲存，例如 `"Mon 08:00 - 17:00, Fri 09:00 - 18:00"`。獨立的 `PharmacyHours` 表（欄位：`dayOfWeek`、`openTime`、`closeTime`）可將時段篩選轉為簡單的有索引 `WHERE` 子句，並正確處理跨午夜的營業時段。

**為何在 `PurchaseHistory` 中以快照方式儲存 `maskName`？**

口罩的名稱與價格可能會異動。在購買當下儲存名稱，可確保即使商品資訊後續更新，歷史購買記錄仍然準確。

**為何使用 PostgreSQL 全文搜尋並以 ILIKE 作為後備？**

`to_tsvector` + `to_tsquery` + `ts_rank` 提供依相關性排序的搜尋結果，並可善用 GIN 索引提升效能。`ILIKE` 後備方案則能補捉英文設定的 tsvector 無法處理的繁體中文字元，確保搜尋結果完整。
