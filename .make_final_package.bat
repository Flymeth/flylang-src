@echo off
echo Binarrizing project...
call npm run binnarize

clear
set /p v="Package version? (xx.xx.xx.xx) -> "

rem "^" character = command continues on the next line
call npx resedit ^
	--i "bin/flylang.exe"  ^
	--o "bin/flylang.exe" ^
	--icon 1,"assets/flylang.ico" ^
	--product-name "Flylang" ^
	--file-description "Flylang files executor." ^
	--company-name "Flymeth's Projects (https://flymeth.net)" ^
	--original-filename "flylang.exe" ^
	--internal-name "flylang" ^
	--legal-copyright "Copyright FlyLang creator. MIT license." ^
	--product-version "%v%" ^
	--no-grow

echo Operation finished!
pause