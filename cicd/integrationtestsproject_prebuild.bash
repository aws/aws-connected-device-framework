#!/bin/bash

set -e

echo integrationtestsproject_prebuild started on `date`

echo Reinstalling dev dependencies...
pnpm i --force
