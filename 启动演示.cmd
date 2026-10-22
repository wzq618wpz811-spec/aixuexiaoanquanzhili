@echo off
cd /d "%~dp0"
echo Open the local address printed below in your browser.
node --env-file-if-exists=.env server.mjs
pause
