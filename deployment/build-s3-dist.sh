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

#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./build-s3-dist.sh source-bucket-base-name solution-name version-code
#
# Paramenters:
#  - source-bucket-base-name: Name for the S3 bucket location where the template will source the Lambda
#    code from. The template will append '-[region_name]' to this bucket name.
#    For example: ./build-s3-dist.sh solutions my-solution v1.0.0
#    The template will then expect the source code to be located in the solutions-[region_name] bucket
#
#  - solution-name: name of the solution for consistency
#
#  - version-code: version of the package

# Check to see if input has been provided:
if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ] || [ -z "$5" ] || [ -z "$6" ]; then
    echo "Please provide the base source bucket name, trademark approved solution name and version where the lambda code will eventually reside."
    echo "For example: ./build-s3-dist.sh solutions trademarked-solution-name v1.0.0"
    exit 1
fi

# Get reference for all important folders
template_dir="$PWD"
template_dist_dir="$template_dir/global-s3-assets"
build_dist_dir="$template_dir/regional-s3-assets"
source_dir="$template_dir/../source"

echo "------------------------------------------------------------------------------"
echo "[Init] Clean old dist, node_modules and bower_components folders"
echo "------------------------------------------------------------------------------"
echo "rm -rf $template_dist_dir"
rm -rf $template_dist_dir
echo "mkdir -p $template_dist_dir"
mkdir -p $template_dist_dir
echo "rm -rf $build_dist_dir"
rm -rf $build_dist_dir
echo "mkdir -p $build_dist_dir"
mkdir -p $build_dist_dir

echo "------------------------------------------------------------------------------"
echo "[Rebuild] Bundle Application"
echo "------------------------------------------------------------------------------"
repositoryRegion=''

if [ -n "$6" ]; then
    repositoryRegion="-R $6"
fi

repositoryUri="$5"
cd "$source_dir/packages/services/simulation-launcher/src/containers/jmeter/infrastructure"
./deploy.bash -b -r $repositoryUri $repositoryRegion

cd $source_dir
rush bundle

echo "------------------------------------------------------------------------------"
echo "[Packing] Templates"
echo "------------------------------------------------------------------------------"

# copy all the cfn templates in the source/infrastructure dir
cp $source_dir/infrastructure/cfn-*.yaml $template_dist_dir/
# copy all the cfn templates in source/infrastructure/cloudformation dir
cp $source_dir/infrastructure/cloudformation/cfn-*.yaml $template_dist_dir/
# copy all the cfn templates in source/infrastructure/lambdaLayers/openssl/infrastructure
cp $source_dir/infrastructure/lambdaLayers/openssl/infrastructure/cfn-*.yml $template_dist_dir/
# copy all the cfn templates ending in yml in source/package/*/infrastructure
cp $source_dir/packages/services/*/infrastructure/cfn-*.yml $template_dist_dir/
# copy all the cfn templates ending in yaml in source/package/*/infrastructure
cp $source_dir/packages/services/*/infrastructure/cfn-*.yaml $template_dist_dir/
# copy all cfn template snippets
cp -a $source_dir/infrastructure/cloudformation/snippets/ $template_dist_dir/snippets/
# copy all cfn templates in libraries/core
cp $source_dir/packages/libraries/core/*/infrastructure/cfn-*.yaml $template_dist_dir/

cd $template_dist_dir
# Rename all *.yaml to *.template
for f in *.yaml; do
    mv -- "$f" "${f%.yaml}.template"
done

# Rename all *.yml to *.template
for f in *.yml; do
    mv -- "$f" "${f%.yml}.template"
done

# remove non-release templates
rm $template_dist_dir/cfn-auth-jwt.template
rm $template_dist_dir/cfn-auth-devicecert.template


# override the S3 Code Uri and TemplateURL for the cfn templates to point to a S3 location
for f in *.template; do
    if [ -f "../transforms/${f%.*}.yaml" ]; then
        yq w -i -s "../transforms/${f%.*}.yaml" "$f"
    fi
done

cd ..
echo "Updating code source bucket in template with $1"
replace="s/%%BUCKET_NAME%%/$1/g"
echo "sed -i '' -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template
replace="s/%%SOLUTION_NAME%%/$2/g"
echo "sed -i '' -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template
replace="s/%%VERSION%%/$3/g"
echo "sed -i '' -e $replace $template_dist_dir/*.template"
sed -i '' -e $replace $template_dist_dir/*.template

replace="s/%%TEMPLATE_BUCKET_NAME%%/$4/g"
sed -i '' -e $replace $template_dist_dir/*.template


echo "------------------------------------------------------------------------------"
echo "[Rebuild] Package Dists"
echo "------------------------------------------------------------------------------"


# Copy and rename dists
cd $build_dist_dir
cp $source_dir/packages/libraries/core/deployment-helper/bundle.zip $build_dist_dir/cdf-deployment-helper.zip
cp $source_dir/infrastructure/lambdaLayers/openssl/build/build.zip $build_dist_dir/cdf-openssl-layer.zip
cp $source_dir/packages/services/assetlibrary/bundle.zip $build_dist_dir/cdf-assetLibrary.zip
cp $source_dir/packages/services/assetlibraryhistory/bundle.zip $build_dist_dir/cdf-assetLibrary-history.zip
cp $source_dir/packages/services/assetlibrary-export/bundle.zip $build_dist_dir/cdf-assetLibrary-export.zip
cp $source_dir/packages/services/provisioning/bundle.zip $build_dist_dir/cdf-provisioning.zip
cp $source_dir/packages/services/commands/bundle.zip $build_dist_dir/cdf-commands.zip
cp $source_dir/packages/services/device-monitoring/bundle.zip $build_dist_dir/cdf-device-monitoring.zip
cp $source_dir/packages/services/events-processor/bundle.zip $build_dist_dir/cdf-events-processor.zip
cp $source_dir/packages/services/events-alerts/bundle.zip $build_dist_dir/cdf-events-alerts.zip
cp $source_dir/packages/services/bulkcerts/bundle.zip $build_dist_dir/cdf-bulkcerts.zip
cp $source_dir/packages/services/certificateactivator/bundle.zip $build_dist_dir/cdf-certificate-activator.zip
cp $source_dir/packages/services/certificatevendor/bundle.zip $build_dist_dir/cdf-certificate-vendor.zip
cp $source_dir/packages/services/simulation-launcher/bundle.zip $build_dist_dir/cdf-simulation-launcher.zip
cp $source_dir/packages/services/simulation-manager/bundle.zip $build_dist_dir/cdf-simulation-manager.zip
cp $source_dir/packages/services/device-patcher/bundle.zip $build_dist_dir/cdf-device-patcher.zip
cp $source_dir/packages/services/greengrass2-provisioning/bundle.zip $build_dist_dir/cdf-greengrass2-provisioning.zip
cp $source_dir/packages/services/greengrass2-installer-config-generators/bundle.zip $build_dist_dir/cdf-greengrass2-installer-config-generators.zip


