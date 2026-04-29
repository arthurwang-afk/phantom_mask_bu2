#!/bin/bash
set -e

echo ""
echo " ========================================="
echo "  PharmaMask 啟動中..."
echo " ========================================="
echo ""

# 啟動 Docker 容器（背景）
docker compose up -d || {
  echo "[錯誤] Docker 啟動失敗，請確認 Docker Desktop 已開啟。"
  exit 1
}

echo ""
echo " 等待伺服器就緒（首次啟動含資料庫初始化與資料匯入，約需 30-60 秒）..."
echo ""

# 輪詢健康檢查，每 3 秒試一次，最多等 120 秒
count=0
until curl -s http://localhost:3000/healthz > /dev/null 2>&1; do
  sleep 3
  count=$((count + 1))
  echo " 已等待 $((count * 3)) 秒..."
  if [ $count -ge 40 ]; then
    echo "[逾時] 伺服器超過 120 秒未就緒，請執行 docker compose logs app 查看錯誤。"
    exit 1
  fi
done

echo ""
echo " ========================================="
echo "  伺服器就緒！正在開啟瀏覽器..."
echo " ========================================="
echo ""
echo "  前端介面  : http://localhost:3000"
echo "  Swagger UI: http://localhost:3000/docs"
echo ""

# 開啟瀏覽器（支援 macOS 和 Linux）
if command -v open &> /dev/null; then
  open http://localhost:3000          # macOS
elif command -v xdg-open &> /dev/null; then
  xdg-open http://localhost:3000      # Linux
else
  echo " 請手動開啟瀏覽器前往 http://localhost:3000"
fi
