#!/bin/bash

set -e

echo integrationtestsproject_install started on `date`

env | sort

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

# note:  pnpm@3.5.7 has broken tsc
echo installing pnpm
npm i -g pnpm@3.5.3
