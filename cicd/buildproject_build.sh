#!/bin/sh

set -e

echo buildproject_build started on `date`

echo building...
pnpm m run build

echo testing...
pnpm m run test

echo versioning...
export GIT_CREDENTIALS="$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD"
pnpm m run semantic-release

# echo Versioning...
# #TODO: read the .unique_changed_paths file that we created as part of the filterproject_prebuild step 
# packages_to_process_file=.cicd_unique_changed_paths
# if [ ! -f $packages_to_process_file ]; then
#     echo "**** $packages_to_process_file DOES NOT EXIST!!!  ****"
#     exit 1
# fi

# while read line; do
#     echo "Processing $line"

#     if [ "$line" == '___ALL___' ]; then
#         # process all packages
#         pnpm m version patch -- -m "CICD: $npm_package_name %s"
#     else
#         # process a specific package
#     fi
# done < $packages_to_process_file


#TODO: only version the ones we've flagged as changed
#TODO: think about using fixed version instead of independant versioning, will make things easier


