@echo off

call node --version

if errorlevel 1 echo You do not have NodeJS installed. && start "" https://nodejs.org/ && pause && exit

call npm --version

if errorlevel 1 echo You do not have NodeJS installed. && start "" https://nodejs.org/ && pause && exit

call npm install

call npm start
