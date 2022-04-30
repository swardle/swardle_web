#! /bin/bash
set -x

source ~/.profile
cd swardle_web
rm -rf *
rm -rf .*
git init
git remote add origin https://github.com/swardle/swardle_web.git
git pull origin main
git checkout main -f
echo $PATH
whoami
whereis go
which go
ls -lha /usr/local/go/bin/go
go mod init github.com/swardle/swardle_web
go mod tidy
go build github.com/swardle/swardle_web/cmd/swardle_web

# run the server in the background
nohup sudo PORT=80 PROJECT_ID=694671698910 ./swardle_web &>/dev/null < /dev/null &

ps -aux | grep swardle_web

set +x
exit