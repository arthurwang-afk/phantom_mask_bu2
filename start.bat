@echo off
chcp 65001 >nul
echo.
echo  =========================================
echo   PharmaMask 啟動中...
echo  =========================================
echo.

:: 啟動 Docker 容器（背景）
docker compose up -d
if %errorlevel% neq 0 (
  echo [錯誤] Docker 啟動失敗，請確認 Docker Desktop 已開啟。
  pause
  exit /b 1
)

echo.
echo  等待伺服器就緒（首次啟動含資料庫初始化與資料匯入，約需 30-60 秒）...
echo.

:: 輪詢健康檢查，每 3 秒試一次，最多等 120 秒
set /a count=0
:wait
timeout /t 3 /nobreak >nul
curl -s http://localhost:3000/healthz >nul 2>&1
if %errorlevel% equ 0 goto ready
set /a count+=1
if %count% geq 40 (
  echo [逾時] 伺服器超過 120 秒未就緒，請執行 docker compose logs app 查看錯誤。
  pause
  exit /b 1
)
set /a secs=count*3
echo  已等待 %secs% 秒...
goto wait

:ready
echo.
echo  =========================================
echo   伺服器就緒！正在開啟瀏覽器...
echo  =========================================
echo.
echo   前端介面  : http://localhost:3000
echo   Swagger UI: http://localhost:3000/docs
echo.
start http://localhost:3000
