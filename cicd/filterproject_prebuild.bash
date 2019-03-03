#!/bin/bash

set -e

echo filterproject_prebuild started on `date`

cd $CODEBUILD_SRC_DIR

#  retrieve the latest git message for this specific commit
git_commit_message="$(git log --format=%B -n 1)"
echo git_commit_message: $git_commit_message

# don't proceed if the commit was made by the CICD pipeline
#if [[ $git_commit_message == "[CICD]:"* ]]; then
if [[ $git_commit_message == *"skip ci"* ]]; then
    echo A CICD commit, therefore ignoring
    exit 1
fi


# echo "Determining which packages have changed"
# changed_paths=()
# # check to see if a previous release has been made (the CICD_LATEST_RELEASE tag is set when a cicd pipeline release is successful)
# if git rev-parse CICD_LATEST_RELEASE >/dev/null 2>&1; then

#     # determine which file paths have changed between the last known release and the specific commit that triggered this pipeline
#     changed_files=$(git log --name-only --pretty=oneline --full-index CICD_LATEST_RELEASE..$CODEBUILD_RESOLVED_SOURCE_VERSION | grep -vE '^[0-9a-f]{40} ' | sort | uniq)
#     echo changed_files: $changed_files

#     # loop through each of the changed files to filter out paths that should not trigger a release
#     for file in $changed_files; do

#         case "$file" in
#             "."* ) 
#                 # ignore any hidden/system files
#                 continue;;
#             "cicd/"* )
#                 # ignore any changes to the cicd/ directory
#                 continue;;
#             "packages/libraries/"* )
#                 # libraries are located 4 levels deep
#                 changed_path=$(cut -d'/' -f 1-4 <<< "$file")
#                 changed_paths+=(changed_path);;
#             "packages/services/"* )
#                 # services are located 3 levels deep
#                 changed_path=$(cut -d'/' -f 1-3 <<< "$file")
#                 changed_paths+=(changed_path);;
#             * )
#                 # everything else, which should be root,trigger a full build
#                 changed_paths+=('___ALL___');;
#         esac

#     done
# else
#     echo "Initial deployment, therefore mark all projects as needing to be processed"
#     changed_paths+=('___ALL___');
# fi
# unique_changed_paths=$(echo $changed_paths | sort | uniq)

# echo "Store the unique changed paths"
# echo "$unique_changed_paths" > ".cicd_unique_changed_paths"
# cat .unique_changed_paths
