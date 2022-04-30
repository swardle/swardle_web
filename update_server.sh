call gcloud config configurations activate scottwardle
call gcloud compute scp cloudscript-kill-server.sh scottwardle_gmail_com@instance-1:./
echo running cloudscript-kill-server.sh on remote computer
call gcloud compute ssh scottwardle_gmail_com@instance-1 --command="source ~/cloudscript-kill-server.sh 2>&1 < /dev/null | tee ~/log/kill-server.txt"

rsync -aP . scottwardle_gmail_com@instance-1.us-west1-b.swardle-compute-engine:swardle_web

call gcloud compute scp cloudscript-boot-server.sh scottwardle_gmail_com@instance-1:./
echo running cloudscript-boot-server.sh on remote computer
call gcloud compute ssh scottwardle_gmail_com@instance-1 --command="source ~/cloudscript-boot-server.sh 2>&1 < /dev/null | tee ~/log/boot-server.txt"

