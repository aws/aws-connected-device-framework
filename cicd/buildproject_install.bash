#!/bin/bash

set -e

echo buildproject_install started on `date`

env | sort

# note:  pnpm@3.5.7 has broken tsc
echo installing pnpm
npm i -g pnpm@3.5.3
