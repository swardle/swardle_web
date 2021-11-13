rem https://stackoverflow.com/questions/26775492/gcloud-compute-copy-files-instance-destination
gcloud compute ssh swardle_gmail_com@instance-1 --command="mkdir ~/go-app"
gcloud compute scp --recurse . swardle_gmail_com@instance-1:~/go-app/*
