
if ! [ -x "$(command -v go)" ]; then
    echo 'Warning: Golang is not installed. installing!'
    sudo apt update
    wget https://golang.org/dl/go1.17.3.linux-amd64.tar.gz
    rm -rf /usr/local/go && tar -C /usr/local -xzf go1.17.3.linux-amd64.tar.gz

    sudo echo "export GOPATH=$HOME/go" >> ~/.profile
    sudo echo "export PATH=$PATH:/usr/local/go/bin;$GOPATH/bin"  >> ~/.profile
    sudo echo "export GOBIN=$GOPATH/bin" >> ~/.profile
    source ~/.profile
    mkdir -p ~/go/{bin,src,pkg}
    go version
else
    echo 'OK: Golang is installed'
    go version
fi

if [ -x "$(command -v apache2])" ]; then
    echo 'Warning: apache2 is installed uninstalling!'
    sudo service apache2 stop
    sudo apt-get remove purge apache2 apache2-utils
    sudo apt-get autoremove -y
    
else
    echo 'OK: Golang is installed'
    go version
fi
