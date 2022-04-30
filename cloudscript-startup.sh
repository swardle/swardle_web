#! /bin/bash
set -x

# install golang
sudo apt update
wget https://golang.org/dl/go1.17.3.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.17.3.linux-amd64.tar.gz
sudo echo "export GOPATH=\$HOME/go" > ~/.profile
sudo echo "export PATH=/usr/local/go/bin:\$GOPATH/bin:~/bin/:\$PATH"  >> ~/.profile
sudo echo "export GOBIN=\$GOPATH/bin" >> ~/.profile
source ~/.profile
mkdir -p ~/go/{bin,src,pkg}
mkdir -p ~/log
mkdir -p ~/bin
go version

# uninstall apache2 
sudo service apache2 stop
sudo apt-get purge apache2 apache2-utils apache2.2-bin apache2-common
# or 
sudo apt-get purge apache2 apache2-utils apache2-bin apache2.2-common
sudo apt-get autoremove -y
which apache2
# sudo service apache2 start

# install unzip tools
sudo apt install -y unzip

# install rsync
sudo apt-get install rsync

# install git
sudo apt install git-all

# include killall
sudo apt-get install psmisc

# clone website from git
sudo killall swardle_web
ps -aux
rm -rf swardle_web
git clone https://github.com/swardle/swardle_web.git
cd swardle_web
go mod init github.com/swardle/swardle_web
go mod tidy
go build github.com/swardle/swardle_web/cmd/swardle_web

# get ssl for https (has user input?) 
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot certonly --standalone -d swardle.com -d www.swardle.com
# Certificate is saved at: /etc/letsencrypt/live/swardle.com/fullchain.pem
# Key is saved at:         /etc/letsencrypt/live/swardle.com/privkey.pem

# run the server in the background
nohup sudo PORT=80 PROJECT_ID=694671698910 ./swardle_web &

set +x