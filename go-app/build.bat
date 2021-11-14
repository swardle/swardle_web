
rem Build for linux on windows
set GOPATH=%USERPROFILE%\go\;%cd%\
set GOBIN=%cd%\
set GOOS=linux
set GOARCH=amd64
go build


rem Build for windows
set GOPATH=%USERPROFILE%\go\;%cd%\
set GOBIN=%cd%\
set GOOS=
set GOARCH=
go build