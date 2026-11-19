@echo off
setlocal
set PROJECT=swardle-compute-engine
set ZONE=us-west1-b
set INSTANCE=instance-1

call gcloud compute scp --project=%PROJECT% --zone=%ZONE% cloudscript-boot-server.sh %INSTANCE%:~/cloudscript-boot-server.sh
if errorlevel 1 exit /b %errorlevel%

echo Running cloudscript-boot-server.sh on %INSTANCE%...
call gcloud compute ssh %INSTANCE% --project=%PROJECT% --zone=%ZONE% --command="bash ~/cloudscript-boot-server.sh"
