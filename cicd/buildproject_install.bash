#!/bin/bash

set -e

echo buildproject_install started on `date`

env | sort

npm i -g @microsoft/rush
