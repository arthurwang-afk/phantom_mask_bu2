# Phantom Mask — TDD 開發 Todolist

> **開發原則**：每一個功能都必須照 🔴 Red → 🟢 Green → 🔵 Refactor 順序執行。
> **不允許**跳過紅燈直接寫實作。每個 checkbox 都是一個獨立的 commit 單位。

---

## 階段 0：專案初始化

### 0.1 建立專案骨架
- [ ] `npm init -y`，設定 `"type": "module"`
- [ ] 安裝 runtime dependencies：
  ```
  fastify @fastify/swagger @fastify/swagger-ui
  @prisma/client
  dotenv
  ```
- [ ] 安裝 dev dependencies：
  ```
  prisma
  vitest @vitest/coverage-v8
  supertest
  tsx
  @types/node
  ```
- [ ] 建立專案目錄結構：
  ```
  src/
  ├── routes/
  ├── services/
  ├── repositories/
  ├── plugins/
  ├── schemas/
  └── utils/
  prisma/
  ├── seed/
  └── migrations/
  tests/
  ├── unit/
  ├── integration/
  └── fixtures/
  ```
- [ ] 建立 `.env.example`（含 `DATABASE_URL`、`PORT`）
- [ ] 建立 `.env`（加入 `.gitignore`）
- [ ] 建立 `vitest.config.ts`：
  - 設定 `coverage.reporter: ['text', 'lcov']`
  - 設定 `globalSetup` / `setupFiles` 指向測試 DB

### 0.2 Docker 設定
- [ ] 建立 `docker-compose.yml`：
  - `postgres` service（含 volume、healthcheck）
  - `app` service（`depends_on: postgres`）
- [ ] 建立 `Dockerfile`（multi-stage build：builder → runner）
- [ ] 確認 `docker compose up` 能成功啟動

### 0.3 Prisma Schema 設計
- [ ] 建立 `prisma/schema.prisma`，定義以下 models：
  ```
  Pharmacy        (id, name, cashBalance)
  PharmacyHours   (id, pharmacyId, dayOfWeek, openTime, closeTime)
  Mask            (id, pharmacyId, name, price, stockQuantity)
  User            (id, name, cashBalance)
  PurchaseHistory (id, userId, pharmacyId, maskId, quantity, totalPrice, transactionDate)
  ```
- [ ] 設定所有 Foreign Key、關聯
- [ ] 設定 Index：
  - `PharmacyHours(dayOfWeek, openTime, closeTime)`
  - `Mask(pharmacyId, price)`
  - `PurchaseHistory(userId, transactionDate)`
  - `Mask(name)` GIN index（migration 裡手動加）
  - `Pharmacy(name)` GIN index
- [ ] 執行 `npx prisma migrate dev --name init`
- [ ] 確認 `npx prisma studio` 可以開啟

### 0.4 Fastify App 骨架
- [ ] 建立 `src/app.ts`（建立 Fastify instance、register plugins）
- [ ] 建立 `src/server.ts`（啟動 server，與 app 分離，方便測試）
- [ ] 確認 `GET /healthz` 回傳 `{ status: 'ok' }` — 這是第一個 **🟢 Green**

---

## 階段 1：ETL 腳本

### 1.1 分析原始資料格式
- [ ] 閱讀 `data/pharmacies.json`，記錄 `openingHours` 的所有格式變體
- [ ] 閱讀 `data/users.json`，記錄 `purchaseHistories` 欄位格式

### 1.2 🔴 Red — 寫 ETL 單元測試
- [ ] 建立 `tests/unit/etl.test.ts`
- [ ] 測試 `parseOpeningHours(str)` 函式：
  - 輸入 `"Mon - Fri 08:00 - 22:00"` → 輸出 5 筆 `{dayOfWeek, openTime, closeTime}`
  - 輸入 `"Sat, Sun 10:00 - 18:00"` → 輸出 2 筆
  - 輸入格式異常字串 → 拋出明確 Error
- [ ] 確認測試 **🔴 失敗**

### 1.3 🟢 Green — 實作 ETL 邏輯
- [ ] 建立 `prisma/seed/parseOpeningHours.ts`
- [ ] 實作 parser，讓所有測試 **🟢 通過**
- [ ] 建立 `prisma/seed/index.ts`：
  - 讀取 JSON → 清洗 → upsert 進 DB
  - 使用 `prisma.$transaction` 確保原子性
- [ ] 在 `package.json` 加入指令：`"seed": "tsx prisma/seed/index.ts"`
- [ ] 執行 `npm run seed`，確認資料進 DB

### 1.4 🔵 Refactor
- [ ] 把 parser 邏輯拆成更小的純函式
- [ ] 加上 ETL 執行時的 console log（顯示匯入筆數）

---

## 階段 2：API #1 — 列出藥局（可依時間篩選）

**Endpoint**: `GET /pharmacies?day=Mon&time=14:00`

### 2.1 🔴 Red — 寫測試
- [ ] 建立 `tests/unit/pharmacyService.test.ts`
- [ ] 測試 `PharmacyService.listPharmacies()`：
  - 無參數 → 回傳全部藥局
  - 帶 `day=Mon, time=14:00` → 只回傳當時營業中的藥局
  - 帶 `time` 但不帶 `day` → 應回傳 400 error
- [ ] 建立 `tests/integration/pharmacies.test.ts`
- [ ] 測試 `GET /pharmacies` HTTP 回應格式、status code
- [ ] 確認測試 **🔴 失敗**

### 2.2 🟢 Green — 實作
- [ ] 建立 `src/repositories/pharmacyRepository.ts`（Prisma 查詢）
- [ ] 建立 `src/services/pharmacyService.ts`（商業邏輯）
- [ ] 建立 `src/schemas/pharmacy.schema.ts`（query params validation）
- [ ] 建立 `src/routes/pharmacies.ts`（route handler）
- [ ] 在 `app.ts` 註冊 route
- [ ] 確認所有測試 **🟢 通過**

### 2.3 🔵 Refactor
- [ ] 確認 SQL query 只打一次（不要 N+1）
- [ ] Swagger 文件標注完整（query params、response schema）

---

## 階段 3：API #2 — 藥局的口罩列表

**Endpoint**: `GET /pharmacies/:id/masks?sort=name|price`

### 3.1 🔴 Red — 寫測試
- [ ] 在 `tests/unit/pharmacyService.test.ts` 補充：
  - `sort=name` → 依名稱 A-Z 排序
  - `sort=price` → 依價格低到高排序
  - `sort` 給不合法值 → 回傳 400
  - 藥局不存在 → 回傳 404
- [ ] 在 `tests/integration/pharmacies.test.ts` 補充 HTTP 測試
- [ ] 確認測試 **🔴 失敗**

### 3.2 🟢 Green — 實作
- [ ] 在 `pharmacyRepository` 加入 `getMasksByPharmacy(id, sort)`
- [ ] 在 `pharmacyService` 加入 `listMasks(pharmacyId, sort)`
- [ ] 在 `routes/pharmacies.ts` 加入 `GET /:id/masks`
- [ ] 確認所有測試 **🟢 通過**

### 3.3 🔵 Refactor
- [ ] sort 邏輯抽成 utility function，可重用

---

## 階段 4：API #3 — 依口罩數量篩選藥局

**Endpoint**: `GET /pharmacies/mask-count?minPrice=10&maxPrice=50&countMin=3`

### 4.1 🔴 Red — 寫測試
- [ ] 建立測試：
  - 價格區間 + 數量下限
  - 價格區間 + 數量上限
  - 價格區間 + 數量上下限
  - 參數缺失 → 回傳 400
- [ ] 確認測試 **🔴 失敗**

### 4.2 🟢 Green — 實作
- [ ] 在 `pharmacyRepository` 加入 `getPharmaciesByMaskCount(filters)`
- [ ] 使用 Prisma `having` 或 raw SQL `GROUP BY ... HAVING COUNT`
- [ ] 確認所有測試 **🟢 通過**

### 4.3 🔵 Refactor
- [ ] 確認 query 效能，有用到 `masks(pharmacyId, price)` index

---

## 階段 5：API #4 — Top N 消費用戶

**Endpoint**: `GET /users/top-spenders?start=2021-01-01&end=2021-01-31&limit=10`

### 5.1 🔴 Red — 寫測試
- [ ] 建立 `tests/unit/userService.test.ts`
- [ ] 建立 `tests/integration/users.test.ts`
- [ ] 測試：
  - 正常查詢 → 回傳依消費金額排序的用戶列表
  - `limit` 預設值為 10
  - `start` > `end` → 回傳 400
  - 日期格式錯誤 → 回傳 400
- [ ] 確認測試 **🔴 失敗**

### 5.2 🟢 Green — 實作
- [ ] 建立 `src/repositories/userRepository.ts`
- [ ] 建立 `src/services/userService.ts`
- [ ] 建立 `src/routes/users.ts`
- [ ] 確認所有測試 **🟢 通過**

### 5.3 🔵 Refactor
- [ ] 確認有用到 `purchase_histories(userId, transactionDate)` index

---

## 階段 6：API #5 — 購買交易（最複雜）

**Endpoint**: `POST /purchases`

```json
{
  "userId": 1,
  "items": [
    { "maskId": 3, "quantity": 2 },
    { "maskId": 7, "quantity": 1 }
  ]
}
```

### 6.1 🔴 Red — 寫測試
- [ ] 建立 `tests/unit/purchaseService.test.ts`
- [ ] 建立 `tests/integration/purchases.test.ts`
- [ ] 測試 **Happy Path**：
  - 正常購買 → 回傳購買摘要、扣款成功
- [ ] 測試 **Error Cases（每個都要獨立測）**：
  - 用戶餘額不足 → 回傳 422，不扣款、不減庫存
  - 某個 mask 庫存不足 → 回傳 422，整筆 rollback
  - userId 不存在 → 回傳 404
  - maskId 不存在 → 回傳 404
  - quantity <= 0 → 回傳 400
  - items 陣列為空 → 回傳 400
- [ ] 確認測試 **🔴 失敗**

### 6.2 🟢 Green — 實作
- [ ] 建立 `src/services/purchaseService.ts`
- [ ] 使用 `prisma.$transaction(async (tx) => { ... })` interactive transaction
- [ ] 流程：
  1. 查用戶、確認存在
  2. 查所有 mask、確認存在且庫存足夠
  3. 計算總金額、確認用戶餘額足夠
  4. 同一 transaction 內：減庫存、扣用戶餘額、加藥局餘額、寫 purchaseHistory
- [ ] **`totalPrice` 存當下成交價快照**（不能只存 maskId）
- [ ] 建立 `src/routes/purchases.ts`
- [ ] 確認所有測試 **🟢 通過**

### 6.3 🔵 Refactor
- [ ] 把「餘額/庫存檢查」邏輯抽成獨立函式，易讀易測
- [ ] 確認 transaction 失敗時 error message 清楚

---

## 階段 7：API #6 — 調整口罩庫存

**Endpoint**: `PATCH /masks/:id/stock`

```json
{ "adjustment": 10 }   // 正數增加，負數減少
```

### 7.1 🔴 Red — 寫測試
- [ ] 測試：
  - `adjustment: 5` → 庫存 +5
  - `adjustment: -3` → 庫存 -3
  - 調整後庫存會 < 0 → 回傳 422
  - maskId 不存在 → 回傳 404
  - `adjustment: 0` → 回傳 400
- [ ] 確認測試 **🔴 失敗**

### 7.2 🟢 Green — 實作
- [ ] 在 `src/services/maskService.ts` 實作 `adjustStock`
- [ ] 建立 `src/routes/masks.ts`
- [ ] 確認所有測試 **🟢 通過**

### 7.3 🔵 Refactor
- [ ] 確認 Prisma `update` 有做樂觀鎖或 `where: { stockQuantity: { gte: adjustment * -1 } }` 防 race condition

---

## 階段 8：API #7 — 批次建立/更新口罩

**Endpoint**: `PUT /pharmacies/:id/masks`

```json
{
  "masks": [
    { "name": "Mask A", "price": 25.0, "stockQuantity": 100 },
    { "name": "Mask B", "price": 15.0, "stockQuantity": 50 }
  ]
}
```

### 8.1 🔴 Red — 寫測試
- [ ] 測試：
  - 全新 mask → 建立成功
  - 已存在同名 mask（同藥局）→ 更新 price 和 stockQuantity
  - 混合新增+更新 → 都成功
  - `masks` 陣列為空 → 回傳 400
  - `price` <= 0 → 回傳 400
  - 藥局不存在 → 回傳 404
- [ ] 確認測試 **🔴 失敗**

### 8.2 🟢 Green — 實作
- [ ] 使用 Prisma `upsert`（以 `pharmacyId + name` 作為 unique key）
- [ ] 在 `prisma/schema.prisma` 加入 `@@unique([pharmacyId, name])` constraint
- [ ] 確認所有測試 **🟢 通過**

### 8.3 🔵 Refactor
- [ ] 批次 upsert 用 `prisma.$transaction([...])` 包起來

---

## 階段 9：API #8 — 搜尋（最複雜）

**Endpoint**: `GET /search?q=mask`

回傳格式：
```json
{
  "pharmacies": [...],
  "masks": [...],
}
```
結果依相關度排序。

### 9.1 🔴 Red — 寫測試
- [ ] 測試：
  - 搜尋 `"Vit"` → 回傳名稱含 Vit 的藥局和口罩
  - 結果依相關度排序（精確匹配 > 前綴匹配 > 包含）
  - `q` 為空字串 → 回傳 400
  - `q` 只有空白 → 回傳 400
  - 無結果 → 回傳 `{ pharmacies: [], masks: [] }` 不是 404
- [ ] 確認測試 **🔴 失敗**

### 9.2 🟢 Green — 實作
- [ ] 建立 `src/repositories/searchRepository.ts`
- [ ] 使用 PostgreSQL `to_tsvector` + `to_tsquery` + `ts_rank` 排序
- [ ] Migration 加入 GIN index：
  ```sql
  CREATE INDEX ON masks USING GIN (to_tsvector('english', name));
  CREATE INDEX ON pharmacies USING GIN (to_tsvector('english', name));
  ```
- [ ] 建立 `src/routes/search.ts`
- [ ] 確認所有測試 **🟢 通過**

### 9.3 🔵 Refactor
- [ ] 搜尋 query 抽成 raw SQL helper，加上清楚的 comment 說明排序邏輯

---

## 階段 10：安全性補強

- [ ] 確認所有 query 都透過 Prisma（防 SQL Injection）
- [ ] 加入 `@fastify/helmet`（防 XSS、設定安全 headers）
- [ ] 加入 `@fastify/rate-limit`（防暴力攻擊）
- [ ] 確認所有 input 都有 JSON Schema validation（Fastify 內建）
- [ ] 確認 `.env` 在 `.gitignore`，不含任何 hard-coded secret
- [ ] 確認 error response **不洩漏** stack trace（production mode）

---

## 階段 11：Coverage 檢查

- [ ] 執行 `npx vitest run --coverage`
- [ ] 確認各層 coverage：
  - `services/` → 目標 **> 80%**
  - `routes/` (integration) → 目標 **> 70%**
- [ ] 修補明顯缺漏的測試案例
- [ ] 確認 `lcov` report 可正常產生

---

## 階段 12：部署與文件

### 12.1 Docker 最終確認
- [ ] `docker compose up --build` 從零開始可以跑起來
- [ ] `docker compose exec app npm run seed` 可以正常匯入資料
- [ ] 測試所有 API endpoint 在 Docker 環境中正常運作

### 12.2 Swagger 文件
- [ ] 確認每個 endpoint 都有：
  - 描述（description）
  - 所有 request params（path / query / body）
  - Response schema（200 的範例）
  - Error response（400 / 404 / 422 的格式）
- [ ] 確認 `GET /docs` 可以開啟 Swagger UI

### 12.3 README.md 撰寫
- [ ] 專案簡介
- [ ] 技術棧列表
- [ ] 快速啟動指令：
  ```bash
  docker compose up -d
  npm run seed
  ```
- [ ] 本地開發啟動方式
- [ ] 環境變數說明（對照 `.env.example`）
- [ ] 測試執行指令與 coverage 產生方式
- [ ] API 文件連結

### 12.4 response.md 撰寫
- [ ] 說明資料庫設計決策（為什麼拆 `PharmacyHours`）
- [ ] 說明 ETL 資料清洗的邏輯
- [ ] 說明搜尋排序的實作方式
- [ ] 說明 Transaction 的設計
- [ ] 說明測試策略（unit vs integration 分層）

---

## 最終提交 Checklist

- [ ] 所有 API 都不回傳 5xx
- [ ] `npm run test` 全部通過
- [ ] `npm run seed` 可以正常執行
- [ ] `docker compose up` 可以正常啟動
- [ ] Swagger UI 完整可讀
- [ ] 無 hard-coded secret
- [ ] `.env.example` 存在
- [ ] `response.md` 有內容
- [ ] Git commit 歷史乾淨（每個功能一個 commit，有意義的 message）

---

## 附錄：Commit Message 規範

```
feat: add GET /pharmacies with time filter
test: add unit tests for PharmacyService.listPharmacies
fix: handle edge case when openTime equals closeTime
refactor: extract opening hours parser to utility function
chore: add GIN index migration for full-text search
docs: update swagger schema for purchase endpoint
```

## 附錄：錯誤回應格式統一

所有 API 的錯誤回應統一格式：
```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Insufficient stock for mask id 3"
}
```
