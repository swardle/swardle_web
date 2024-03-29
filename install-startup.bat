rem call gcloud compute instances create instance-1 --project=swardle-compute-engine --zone=us-west1-b --machine-type=e2-micro --network-interface=address=35.230.100.1,network-tier=PREMIUM,subnet=default --public-ptr --public-ptr-domain=swardle.com. --maintenance-policy=MIGRATE --service-account=694671698910-compute@developer.gserviceaccount.com --scopes=https://www.googleapis.com/auth/cloud-platform --enable-display-device --tags=http-server,https-server --create-disk=auto-delete=yes,boot=yes,device-name=instance-1,image=projects/ubuntu-os-cloud/global/images/ubuntu-2004-focal-v20220419,mode=rw,size=10,type=projects/swardle-compute-engine/zones/us-west1-b/diskTypes/pd-standard --no-shielded-secure-boot --shielded-vtpm --shielded-integrity-monitoring --reservation-affinity=any --metadata=enable-oslogin=TRUE

rem timeout/t 60 /nobreak
call gcloud compute ssh swardle_gmail_com@instance-1 --command="rm -rf bin log"
call gcloud compute ssh swardle_gmail_com@instance-1 --command="mkdir bin"
call gcloud compute ssh swardle_gmail_com@instance-1 --command="mkdir log"
call gcloud compute scp cloudscript-startup.sh swardle_gmail_com@instance-1:./
echo running cloudscript-startup.sh on remote computer
call gcloud compute ssh swardle_gmail_com@instance-1 --command="source ~/cloudscript-startup.sh 2>&1 | tee ~/log/startup.txt"
call gcloud compute scp swardle_gmail_com@instance-1:./log/startup.txt . && code startup.txt

rem gcloud compute instances add-metadata instance-1 --metadata-from-file=startup-script=cloudscript-startup.sh
rem sudo google_metadata_script_runner startup
rem sudo journalctl -u google-startup-scripts.service