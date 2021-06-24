#!/bin/bash

set -e

echo deployproject_install started on `date`

env | sort

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

echo installing mkdocs...
### note this must be installed individually else pip struggles with dependency resolution
pip install --upgrade pip
pip install mkdocs 
pip install markdown-include 
pip install pymdown-extensions 
pip install mkdocs-material
