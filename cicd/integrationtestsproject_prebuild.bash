#!/bin/bash

set -e

echo integrationtestsproject_prebuild started on `date`

echo Installing...
rush update --purge
