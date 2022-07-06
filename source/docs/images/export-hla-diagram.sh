#!/bin/sh

# Export the sheets/tabs of cdf-core-hla.drawio as PNG files for embedding in readme and documentation
# files. This script assumes that the draw.io executable is installed locally and available on the PATH. 
# See https://github.com/jgraph/drawio-desktop/ for draw.io installers.
#
# Unused HLA diagrams in cdf-core-hla.drawio (tab index, CDF module name):
# 5 Commands (deprecated)
# 11 Certificate Renewer

draw.io --export --format png --page-index 0 --output "./cdf-core-hla-lifecycle.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "./cdf-core-hla-lifecycle.png.license"
draw.io --export --format png --page-index 1 --output "./cdf-core-hla-HLA.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "./cdf-core-hla-HLA.png.license"
draw.io --export --format png --page-index 2 --output "./cdf-core-hla-hla-aws.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "./cdf-core-hla-hla-aws.png.license"
draw.io --export --format png --page-index 3 --output "../../packages/services/assetlibrary/docs/images/cdf-core-hla-Asset Library.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/assetlibrary/docs/images/cdf-core-hla-Asset Library.png.license"
draw.io --export --format png --page-index 4 --output "../../packages/services/bulkcerts/docs/images/bulkcerts.hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/bulkcerts/docs/images/bulkcerts.hla.png.license"
draw.io --export --format png --page-index 6 --output "../../packages/services/device-patcher/docs/images/device-patcher-hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/device-patcher/docs/images/device-patcher-hla.png.license"
draw.io --export --format png --page-index 7 --output "../../packages/services/greengrass2-provisioning/docs/images/greengrass2-hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/greengrass2-provisioning/docs/images/greengrass2-hla.png.license"
draw.io --export --format png --page-index 8 --output "../../packages/services/provisioning/docs/images/provisioning.hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/provisioning/docs/images/provisioning.hla.png.license"
draw.io --export --format png --page-index 9 --output "../../packages/services/certificateactivator/docs/images/certificateactivator-hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/certificateactivator/docs/images/certificateactivator-hla.png.license"
draw.io --export --format png --page-index 10 --output "../../packages/services/certificatevendor/docs/images/certificatevendor-hla.png" cdf-core-hla.drawio
cp cdf-core-hla.drawio.license "../../packages/services/certificatevendor/docs/images/certificatevendor-hla.png.license"
