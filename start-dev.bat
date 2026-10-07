@echo off
echo ==============================================
echo MES Audio Studio - Developer Mode
echo ==============================================

echo [1/3] Starting VieNeu-TTS (Port 8000)...
start "VieNeu TTS" cmd /c "cd /d P:\web\vieneu && uv run python -m apps.openai_speech"

echo [2/3] Starting Backend (Port 3001)...
start "Backend API" cmd /c "cd /d %~dp0backend && npm run dev"

echo [3/3] Starting Frontend (Vue + Vite)...
start "Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo All services started in separate windows!
pause
