#!/bin/sh
set -eu

repo="zt3xdv/frontend-base"
ref="main"
tmp="$(mktemp -d)"

trap 'rm -rf "$tmp"' EXIT

curl -fsSL "https://codeload.github.com/$repo/tar.gz/refs/heads/$ref" | tar -xz -C "$tmp" --strip-components=1

node "$tmp/bin/create-frontend-base.js" "$@"
