#!/bin/sh
set -e

# If the first arg is not a supported command append "check" to the front
if ! (which $1 > /dev/null); then
	set -- /usr/src/app/check "$@"
fi

exec "$@"
