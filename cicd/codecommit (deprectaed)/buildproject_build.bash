#!/bin/bash

set -e

echo buildproject_build started on `date`


echo building...
rush build

echo testing...
rush test
