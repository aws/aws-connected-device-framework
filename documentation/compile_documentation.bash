#!/bin/bash

set -e

# install the swagger to markdown converter
npm i -g swagger-markdown

# sync the latest swagger
swagger-markdown -i ../packages/services/assetlibrary/infrastructure/swagger.yml -o docs/projects/assetlibrary/assetlibrary-swagger.md
swagger-markdown -i ../packages/services/assetlibraryhistory/infrastructure/swagger.yml -o docs/projects/assetlibrary-history/assetlibraryhistory-swagger.md
swagger-markdown -i ../packages/services/commands/infrastructure/swagger.yml -o docs/projects/commands/commands-swagger.md
swagger-markdown -i ../packages/services/provisioning/infrastructure/swagger.yml -o docs/projects/provisioning/provisioning-swagger.md
swagger-markdown -i ../packages/services/bulkcerts/infrastructure/swagger.yml -o docs/projects/bulkcerts/bulkcerts-swagger.md
swagger-markdown -i ../packages/services/events-processor/infrastructure/swagger.yml -o docs/projects/notifications/events-processor-swagger.md

# build it
rm -rf site
mkdocs build
