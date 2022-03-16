#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

set -e

echo filterproject_prebuild started on `date`

#  retrieve the latest git message for this specific commit
git_commit_message="$(git log --format=%B -n 1)"
echo git_commit_message: $git_commit_message

# don't proceed if the commit was made by the CICD pipeline
#if [[ $git_commit_message == "[CICD]:"* ]]; then
if [[ $git_commit_message == *"[skip ci]"* ]]; then
    echo A CICD commit, therefore ignoring
    exit 1
fi

exit 0
