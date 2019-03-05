# Installation

```sh
pip install mkdocs markdown-include pymdown-extensions mkdocs-material
```

# To view the documentation locally:

```sh
mkdocs serve
```

The documentation will then be available at `http://127.0.0.1:8000`.

# Syncing Swagger

First, ensure you have the swagger-markdown plugin installed:

```sh
npm i -g swagger-markdown
```

Then run the following from the root of the project:
```sh
swagger-markdown -i ../cdf-assetlibrary/infrastructure/swagger.yml -o docs/projects/assetlibrary/assetlibrary-swagger.md
swagger-markdown -i ../cdf-assetlibraryhistory/infrastructure/swagger.yml -o docs/projects/assetlibrary-history/assetlibraryhistory-swagger.md
swagger-markdown -i ../cdf-commands/infrastructure/swagger.yml -o docs/projects/commands/commands-swagger.md
swagger-markdown -i ../cdf-provisioning/infrastructure/swagger.yml -o docs/projects/provisioning/provisioning-swagger.md
swagger-markdown -i ../cdf-bulkcerts/infrastructure/swagger-template.yml -o docs/projects/bulkcerts/bulkcerts-swagger.md
```

# To publish the documentation

```sh
mkdocs build
aws s3 sync site s3://cdf-157731826412-us-west-2-docs
rm -rf site
```