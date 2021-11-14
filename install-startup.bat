call gcloud compute instances create instance-1 --project=swardle-compute-engine --zone=us-west1-b --machine-type=e2-micro --network-interface=network-tier=PREMIUM,subnet=default --maintenance-policy=MIGRATE --service-account=694671698910-compute@developer.gserviceaccount.com --scopes=https://www.googleapis.com/auth/cloud-platform --enable-display-device --tags=http-server,https-server --create-disk=auto-delete=yes,boot=yes,device-name=instance-1,image=projects/ubuntu-os-cloud/global/images/ubuntu-2004-focal-v20211102,mode=rw,size=10,type=projects/swardle-compute-engine/zones/us-west1-b/diskTypes/pd-balanced --no-shielded-secure-boot --shielded-vtpm --shielded-integrity-monitoring --reservation-affinity=any --metadata=enable-oslogin=TRUE 
timeout /t 60 /nobreak
call gcloud compute ssh swardle_gmail_com@instance-1 --command="mkdir bin"
call gcloud compute scp startup-script.sh swardle_gmail_com@instance-1:./bin
call gcloud compute ssh swardle_gmail_com@instance-1 --command="source ~/bin/startup-script.sh &> ~/log/startup.txt"
call gcloud compute scp swardle_gmail_com@instance-1:./log/startup.txt . && code startup.txt

rem gcloud compute instances add-metadata instance-1 --metadata-from-file=startup-script=startup-script.sh
rem sudo google_metadata_script_runner startup
rem sudo journalctl -u google-startup-scripts.service