#! /bin/bash
set -x

sudo apt update
wget https://golang.org/dl/go1.17.3.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.17.3.linux-amd64.tar.gz
sudo echo "export GOPATH=\$HOME/go" > ~/.profile
sudo echo "export PATH=\$PATH:/usr/local/go/bin:\$GOPATH/bin:~/bin/"  >> ~/.profile
sudo echo "export GOBIN=\$GOPATH/bin" >> ~/.profile
source ~/.profile
mkdir -p ~/go/{bin,src,pkg}
mkdir -p ~/log
mkdir -p ~/bin
mkdir -p ~/go/src/github.com/swardle/go-app/
go version

sudo apt-get remove purge apache2 apache2-utils
sudo apt-get autoremove -y
sudo apt install -y unzip

set +x