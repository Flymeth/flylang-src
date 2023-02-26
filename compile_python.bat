@echo off
:start
set json=
set restart=

set /p in= "Input file: "
set /p out= "Output file (must be a .py file): "
set /p json= "Json file (press ENTER without any value to disable): "
set compArgs=%in% %out% ^-^-langOutput^=python
if not "%json%"=="" (
   set compArgs= %compArgs% ^-^-debugJsonFile^=%json%
   echo val changed!!
)
set cmd=node dist/flylang^.js %compArgs%

echo Running "%cmd%"
call %cmd%
echo Operation made succefully!!
set /p restart="Press ENTER to restart, or anything else to quit "
cls
if "%restart%"=="" goto :start