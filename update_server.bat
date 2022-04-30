call gcloud config configurations activate swardle-com
call gcloud compute scp cloudscript-kill-server.sh scottwardle_gmail_com@instance-1:./
echo running cloudscript-kill-server.sh on remote computer
call gcloud compute ssh scottwardle_gmail_com@instance-1 --command="source ~/cloudscript-kill-server.sh 2>&1 < /dev/null | tee ~/log/kill-server.txt"

rem gcloud compute config-ssh
rem rsync -aP . scottwardle_gmail_com@instance-1.us-west1-b.swardle-compute-engine:swardle_web
rem powershell Compress-Archive . temp.zip
rem call gcloud compute scp --recurse scottwardle_gmail_com@instance-1:temp.zip temp.zip
rem call gcloud compute ssh scottwardle_gmail_com@instance-1 --command="rm -r ~/swardle_web; unzip temp.zip -d ~/swardle_web"
rem del temp.zip

call gcloud compute scp cloudscript-boot-server.sh scottwardle_gmail_com@instance-1:./
echo running cloudscript-boot-server.sh on remote computer
call gcloud compute ssh scottwardle_gmail_com@instance-1 --command="source ~/cloudscript-boot-server.sh 2>&1 < /dev/null | tee ~/log/boot-server.txt"

