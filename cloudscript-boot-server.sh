#! /bin/bash
set -x

cd swardle_web
git pull
go build

# run the server in the background
nohup sudo PORT=80 PROJECT_ID=694671698910 ./swardle_web &>/dev/null < /dev/null &

ps -aux | grep swardle_web

set +x
exit