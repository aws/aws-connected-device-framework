#!/bin/bash

set -e

echo buildproject_build started on `date`


aws s3 cp shrinkwrap.yaml s3://cdf-157731826412-us-west-2


echo building...
pnpm m run build

echo testing...
pnpm m run test
