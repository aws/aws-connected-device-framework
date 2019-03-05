#!/bin/bash

set -e

echo buildproject_install started on `date`

env | sort

echo installing pnpm
npm i -g pnpm
