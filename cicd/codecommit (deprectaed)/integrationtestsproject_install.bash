#!/bin/bash

set -e

echo integrationtestsproject_install started on `date`

env | sort

npm i -g @microsoft/rush
