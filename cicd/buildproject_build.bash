#!/bin/bash

set -e

echo buildproject_build started on `date`


echo building...
npm run build

echo testing...
npm run test
