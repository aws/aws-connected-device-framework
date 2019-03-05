#!/bin/bash

set -e

echo buildproject_install started on `date`

env | sort

echo configuring git
git config --global user.email "$CDF_CODECOMMIT_EMAIL"
git config --global user.name "$CDF_CODECOMMIT_USERNAME"

echo installing pnpm
npm i -g pnpm
