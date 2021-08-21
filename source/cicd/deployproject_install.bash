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

echo deployproject_install started on `date`

env | sort

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

echo installing mkdocs...
### note this must be installed individually else pip struggles with dependency resolution
pip install --upgrade pip
pip install mkdocs 
pip install markdown-include 
pip install pymdown-extensions 
pip install mkdocs-material
