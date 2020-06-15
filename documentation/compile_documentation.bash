#!/bin/bash

set -e

# install the swagger to markdown converter
npm i -g widdershins

# sync the latest swagger
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/assetlibrary/infrastructure/swagger.yml -o docs/projects/assetlibrary/assetlibrary-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/assetlibraryhistory/infrastructure/swagger.yml -o docs/projects/assetlibrary-history/assetlibraryhistory-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/commands/infrastructure/swagger.yml -o docs/projects/commands/commands-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/provisioning/infrastructure/swagger.yml -o docs/projects/provisioning/provisioning-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/bulkcerts/infrastructure/swagger.yml -o docs/projects/bulkcerts/bulkcerts-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/events-processor/infrastructure/swagger.yml -o docs/projects/notifications/events-processor-swagger.md
widdershins --language_tabs 'shell:Shell:curl' 'node:Node:request' 'python:Python:python3' --summary true  ../packages/services/greengrass-provisioning/infrastructure/swagger.yml -o docs/projects/greengrass-provisioning/greengrass-provisioning-swagger.md

# build it
rm -rf site
mkdocs build
