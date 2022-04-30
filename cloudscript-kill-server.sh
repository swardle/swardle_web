#! /bin/bash
set -x

sudo killall swardle_web
ps -aux | grep swardle_web

set +x
exit