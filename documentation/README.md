# Documentation

## Local Installation

Install `pango` library (a deoendency of WeasyPrint).

```sh
# OSX:
brew install pango
```

```sh
pip install mkdocs markdown-include pymdown-extensions mkdocs-material mkdocs-pdf-export-plugin
```

## To view the documentation locally:

```sh
mkdocs serve
```

The documentation will then be available at `http://127.0.0.1:8000`.

## To export the documentationa as a PDF"

```sh
ENABLE_PDF_EXPORT=1 mkdocs build
```

The exported pdf will be found at `site/pdf/cdf.pdf`

## Syncing Swagger

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

## To publish the documentation to S3

```sh
mkdocs build
aws s3 sync site s3://cdf-157731826412-us-west-2-docs
rm -rf site
```