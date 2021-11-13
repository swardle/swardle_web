
rem Build for linux on windows
set GO111MODULE=off
set GOPATH=%USERPROFILE%\go\;%cd%\
set GOBIN=%cd%\
set GOOS=linux
set GOARCH=amd64
go get
go build


rem Build for windows
set GO111MODULE=off
set GOPATH=%USERPROFILE%\go\;%cd%\
set GOBIN=%cd%\
set GOOS=
set GOARCH=
go get
go build