@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: Get the directory where the script is located
set "script_dir=%~dp0"

:: Output file
set "output_file=%script_dir%file_paths.txt"

:: Clear the output file if it exists
echo. > "%output_file%"

:: Loop through all files including subdirectories
for /r "%script_dir%" %%F in (*) do (
    echo %%F >> "%output_file%"
)

:: Notify user
echo File paths saved to "%output_file%"
pause
