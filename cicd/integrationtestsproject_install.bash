#!/bin/bash

set -e

echo integrationtestsproject_install started on `date`

env | sort

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

echo installing pnpm
npm i -g pnpm
