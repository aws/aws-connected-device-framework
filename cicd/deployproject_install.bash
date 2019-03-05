#!/bin/bash

set -e

echo deployproject_install started on `date`

env | sort

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

echo configuring git
git config --global user.email "$CDF_CODECOMMIT_EMAIL"
git config --global user.name "$CDF_CODECOMMIT_USERNAME"


