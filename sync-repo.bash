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

# Added a remote branch to codecommit repo
git remote add upstream ssh://git.amazon.com/pkg/Cdf-core

# Fetch remote
git fetch upstream

#Create a branch of from master
git checkout -b sync_upstream_master

#Push the changes from local gf_master to the remote branch gitfarm/master
git push --set-upstream upstream master

git checkout master

#Set the tracking branch back to master
git branch -D sync_upstream_master
git remote remove upstream

