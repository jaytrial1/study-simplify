@echo off
setlocal

:: === Paths to ignore ===
set "ignore_path1=E:\jay\Xampp\htdocs\main\public\pdf_repository"
set "ignore_path2=E:\jay\Xampp\htdocs\main\.git"

:: Get current directory of the batch file
set "base_dir=%~dp0"

:: Output file
set "output_file=%base_dir%file_paths_output.txt"

:: Use DIR to get all file paths and exclude the ignored ones using FINDSTR
(
    dir /b /s "%base_dir%" 
) | findstr /I /V /C:"%ignore_path1%" | findstr /I /V /C:"%ignore_path2%" > "%output_file%"

echo Done! Paths saved to: %output_file%
pause
