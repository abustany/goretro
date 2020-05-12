#!/bin/bash

set -e

on_exit() {
	set +e
	[ -n "$GORETRO_PID" ] && kill $GORETRO_PID
	[ -n "$DEV_SERVER_PID" ] && kill $DEV_SERVER_PID
	wait
	exit $EXIT_CODE
}

trap on_exit EXIT

if [ -n "$CI" ]; then
	echo "=== Installing 3rd party dependencies"
	# 3rd party deps copied from https://github.com/microsoft/playwright-github-action/blob/master/index.js
	sudo apt update
	sudo apt -y install \
		libgbm-dev \
		libwoff1 \
		libopus0 \
		libwebp6 \
		libwebpdemux2 \
		libenchant1c2a \
		libgudev-1.0-0 \
		libsecret-1-0 \
		libhyphen0 \
		libgdk-pixbuf2.0-0 \
		libegl1 \
		libgles2 \
		libevent-2.1-6 \
		libnotify4 \
		libxslt1.1
fi

echo "=== Build server"
go build ./cmd/...

echo "=== Install UI dependencies"
yarn --cwd ui --prefer-offline

echo "=== Install E2E test dependencies"
yarn --cwd e2e --prefer-offline

echo "=== Start server"
./goretro >/dev/null &
GORETRO_PID=$!

echo "=== Start UI development server"
yarn --cwd ui start >/dev/null &
DEV_SERVER_PID=$!

echo "=== Wait for development server to come up"
while true; do
	set +e
	curl -sf -o/dev/null http://127.0.0.1:3000
	CURL_RES=$?
	set -e

	case $CURL_RES in
		0)
		echo "=== Development server is up!"
		break
		;;

		7)
		echo "=== Development server is not up yet"
		sleep 1
		continue
		;;

		*)
		echo "=== Unexpected curl exit code: $?"
		exit 1
		;;
	esac
done

echo "=== Run the tests"
yarn --cwd e2e run codeceptjs run -p screenshotOnFail --steps
EXIT_CODE=$?
