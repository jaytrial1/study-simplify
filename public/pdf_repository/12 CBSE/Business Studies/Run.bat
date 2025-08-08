@echo off
setlocal enabledelayedexpansion

:: Define the output file name
set "OutputFile=BluePrint.txt"

echo This is a project folder's road map, and it includes the content of .MD files.
cd /d "%~dp0"
echo Current Folder Location: %cd%
echo.

echo --- Roadmap of the Folder ---
tree /F
echo.

:: Create a new output file
(
    echo This is a project folder's road map, and it includes the content of .MD files.
    echo Current Folder Location: %cd%
    echo.
    echo --- Roadmap of the Folder ---
    tree /F
    echo.
) > "%OutputFile%"

echo --- Markdown (MD) Files and Content ---

for /r %%i in (*.md) do (
    set "File=%%~nxi"
    :: Check if the file or folder starts with a dot (hidden), and exclude it.
    if "!File:~0,1!" neq "." (
        echo File: %%~nxi
        type "%%i"
        echo.
        echo.
        echo.
        echo.
        echo.
    )
)

echo.
echo Blueprint output saved to "%OutputFile%"

endlocal

:: Exit to prevent the "Press any key to continue" prompt
exit
