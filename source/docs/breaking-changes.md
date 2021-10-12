# BREAKING CHANGES

This document outlines major releases, such as backward incompatible features.  Refer to the CDF changelogs for specific details of each release.
### aws-connected-device-framework-1.0.0 tag

Affects individual package versions:

package | version
--- | ---
@cdf/integration-tests | 2.9.2
@cdf/assetlibrary-client | 4.1.1
@cdf/assetlibraryhistory-client | 4.0.1
@cdf/bulkcerts-client | 1.1.0
@cdf/commands-client | 4.1.0
@cdf/greengrass-deployment-client | 1.1.0
@cdf/greengrass-provisioning-client | 2.1.0
@cdf/notifications-client | 3.0.1
@cdf/provisioning-client | 4.0.1
@cdf/config-inject | 3.0.0
@cdf/deployment-helper | 2.0.0
@cdf/errors | 3.0.0
@cdf/express-middleware | 2.1.0
@cdf/lambda-invoke | 2.0.0
@cdf/logger | 3.0.0
@cdf/device-simulator-base | 1.0.1
@cdf/assetlibrary | 5.3.2
@cdf/assetlibrary-export | 2.0.1
@cdf/assetlibrary-history | 4.1.1
@cdf/auth-devicecert | 4.0.1
@cdf/auth-jwt | 2.0.2
@cdf/bulkcerts | 5.1.1
@cdf/certificate-activator | 3.1.2
@cdf/certificate-renewer | 2.1.4
@cdf/certificate-vendor | 4.1.0
@cdf/commands | 4.2.1
@cdf/device-monitoring | 4.0.3
@cdf/events-alerts | 2.0.3
@cdf/events-processor | 3.2.1
@cdf/greengrass-deployment | 4.2.0
@cdf/greengrass-provisioning | 4.3.0
@cdf/provisioning | 4.2.0
@cdf/simulation-launcher | 2.0.0
@cdf/simulation-manager | 2.0.0

*Notes of interest:*

Includes the following additional modules:
-   `assetlibrary-export`
-   `simulation-launcher`
-   `simulation-manager`

Has the following modules temporarily removed from the open source version:
- `greengrass-provisioning`
- `greengrass-deployment`

Has the following deprecated modules permanently removed:
- `request-requeue`

In this relase we introduce two distinct deployment methods for CDF:
-   `Multi stack deployment`: This is the recommended deployment method. In this deployment method each module is deployed as independant CloudFormation stacks. This deployment method is compatible with older CDF deployments and should be used to migrate existing CDF projects. Refer to the [migration guide](./migration.md) for further details.   
-   `Single stack deployment`: This deployment method should only be used for setting up demo CDF environments in a single click and deploy fashion. It deploys a nested CDF stack that creates all the required modules. This deployment method is not compatible with older CDF deployments. This deployment method should not be used in a production environment.
 
Includes the following breaking changes:
-   Any application that has a CloudFormation stack that depends on the CloudFormation outputs that CDF provides, will be affected. Refer to the [migration guide](./migration.md) for further details.  
-   Migration from a previous CDF deployment to the single stack deployment will be a breaking change. The single stack deployment path is not recommended for production workloads due to the tightly coupling of CloudFormation stacks. In case you decide to go ahead with the migration refer to the [migration guide](./migration.md) to backup your existing datastores before the migration.
-   Any existing CI/CD piplines or deployment scripts will be affected. Due to the significant number of changes that have been made in this release any existing deployment pipeline will need to be updated to take these changes into account.

When performing an upgrade to the new CDF version it is recommended to backup your existing datastores. Please refer to the [migration guide](./migration.md) for further details.


## Pre open-source versions
### cdf-core-20210119*-BREAKING-CHANGE.tar

Affects individual package versions:

package | version
--- | ---
@cdf/assetlibrary | 4.0.0
@cdf/assetlibrary-history | 4.0.0
@cdf/auth-devicecert | 4.0.0
@cdf/auth-jwt | 2.0.0
@cdf/bulkcerts | 5.0.0
@cdf/certificate-activator | 3.0.0
@cdf/certificate-vendor | 4.0.0
@cdf/commands | 4.0.0
@cdf/device-monitoring | 4.0.0
@cdf/events-alerts | 2.0.0
@cdf/events-processor | 3.0.0
@cdf/greengrass-deployment | 4.0.0
@cdf/greengrass-provisioning | 4.0.0
@cdf/provisioning | 4.0.0
@cdf/request-queue | 4.0.0

*Notes of interest:*

This version replaces the PNPM v3 based build system with Rush and PNPM v5. The instigator of this is the upcoming open sourcing of the CDF where pinning to old dependency versions (PNPM v3) is not allowed. Refer to the updated _advanced/deployment_ and _development/quick start_ documention for further details. Also note that an updated _cdf-infrastructure-demo_ and _cdf-facade-demo_ project accompanies this change.


### cdf-core-20200610211924-BREAKING-CHANGE.tar

Affects individual package versions:

package | version
--- | ---
@cdf/assetlibrary | 3.4.3
@cdf/assetlibrary-history | 3.3.1
@cdf/auth-devicecert | 3.2.1
@cdf/auth-jwt | 1.2.1
@cdf/bulkcerts | 4.3.1
@cdf/certificate-activator | 2.3.1
@cdf/certificate-vendor | 3.3.1
@cdf/commands | 3.3.1
@cdf/device-monitoring | 3.2.1
@cdf/events-alerts | 1.2.1
@cdf/events-processor | 2.4.1
@cdf/greengrass-deployment | 3.0.2
@cdf/greengrass-provisioning | 3.0.2
@cdf/provisioning | 3.3.1
@cdf/request-queue | 3.3.1

*Notes of interest:*

As this release includes quite a few changes that need will need merging into your own installation, unless you need some of this new functionality right now, the recommendation is for you to not migrate to this version.  The reason being, there is an upcoming release with major changes to the deployment system, therefore hold off if you can.

Includes breaking changes to the deploy process:

- Prior to this version, security ingress/egress rules between Neptune and Asset Library were created via the AWS CLI. From this version on they are managed via CloudFormation.  Before starting an update you must delete these previously created ingress/egress rules manually (and potentially any associated network interfaces) using the following steps:
    - Load the `cdf-assetlibrary-${ENVIRONMENT}` Cloudformation stack, and within the _Resources_ tab click on the _Physical ID_ of _Logical ID_ `AssetLibrarySecurityGroup`
    - Select said security group, then click the *Actions > Delete Security Group* button
    - If `security group associated` is present in *reason*, click to load affected security groups, click _Inbound rules), then remove the said security group from the list
    - If `network interfaces associated` is present in *reason*, click to load affected network interfaces. For each affected network interface, select it, then click *Actions > Change security groups*.  Unselect the `Asset library security group` and instead select the `default VPC security group`.  Click _Save_
- Due to final lambda bundle size constraints, dependency declaration for CDF libraries have changed to use peer dependencies.  This means that all declared dependencies at the CDF library level now must be explicitly declared by the consuming module, such as a facade module.  
    - Refer to the differences in `cdf-facade-demo/package.json` for details of how to update your own facade dependencies
    - Refer to the differences in `cdf-infrastructure-demo/deploy.bash` for details of how to update your own deploy script with the updated build process
- This release introduced APIGW authentication which resulted in almost all deploy scripts changing.
