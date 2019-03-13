#!/bin/bash

set -e

echo buildproject_build started on `date`


echo building...
pnpm m run build

echo testing...
pnpm m run test
