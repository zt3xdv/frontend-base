#!/bin/sh
set -eu

repo="zt3xdv/frontend-base"
ref="main"
tmp="$(mktemp -d)"

trap 'rm -rf "$tmp"' EXIT

curl -fsSL "https://codeload.github.com/$repo/tar.gz/refs/heads/$ref" | tar -xz -C "$tmp" --strip-components=1

if ! [ -t 0 ] && ! [ "${0##*/}" = "create.sh" ]; then
  if (exec < /dev/tty) 2> /dev/null; then
    exec < /dev/tty
  fi
fi

node "$tmp/bin/create-frontend-base.js" "$@"
