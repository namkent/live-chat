@echo off
chcp 65001 >nul
echo ==============================================
echo TOOL CONVERT TỰ ĐỘNG FBX/ABC SANG GLB (BLENDER)
echo ==============================================

set BLENDER_PATH="C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
set SOURCE_DIR=%~dp0fbx_source
set DEST_DIR=%~dp0frontend\public\avatars
set PYTHON_SCRIPT=%DEST_DIR%\convert_fbx_to_glb.py

if not exist "%SOURCE_DIR%" (
    mkdir "%SOURCE_DIR%"
)

echo Dang quet thu muc: %SOURCE_DIR%
echo.

set count=0
for %%f in ("%SOURCE_DIR%\*.fbx" "%SOURCE_DIR%\*.abc") do (
    set /a count+=1
    echo [%%~nxf] Dang convert...
    %BLENDER_PATH% --background --python "%PYTHON_SCRIPT%" -- "%%f" "%DEST_DIR%\%%~nf.glb" >nul 2>&1
    echo =^> Da xuat thanh cong: frontend\public\avatars\%%~nf.glb
    echo.
)

if %count%==0 (
    echo Khong tim thay file .fbx hay .abc nao trong thu muc fbx_source!
    echo Vui long copy file vao thu muc roi chay lai tool.
) else (
    echo Hoan thanh convert %count% file!
)

pause
