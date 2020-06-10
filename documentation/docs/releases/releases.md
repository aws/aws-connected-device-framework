# RELEASE INFO

This document outlines major releases, such as backward incompatible features.  Refer to the CDF changelogs for specific details of each release.

## cdf-core-20200610211924-BREAKING-CHANGE.tar

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

Notes of interest:
Includes breaking changes to the deploy process:
- Prior to this version, security ingress/egress rules between Neptune and Asset Library were created via the AWS CLI. From this version on they are managed via CloudFormation.  Before starting an update you must delete these previously created ingress/egress rules manually (and potentially any associated network interfaces) using the following steps:
    - Load the `cdf-assetlibrary-${ENVIRONMENT}` Cloudformation stack, and within the _Resources_ tab click on the _Physical ID_ of _Logical ID_ `AssetLibrarySecurityGroup`
    - Select said security group, then click the *Actions > Delete Security Group* button
    - If `security group associated` is present in *reason*, click to load affected security groups, click _Inbound rules), then remove the said security group from the list
    - If `network interfaces associated` is present in *reason*, click to load affected network interfaces. For each affected network interface, select it, then click *Actions > Change security groups*.  Unselect the `Asset library security group` and instead select the `default VPC security group`.  Click _Save_
- Due to final lambda bundle size constraints, dependency declaration for CDF libraries have changed to use peer dependencies.  This means that all declared dependencies at the CDF library level now must be explicitly declared by the consuming service, such as a facade service.  
    - Refer to the differences in `cdf-facade-demo/package.json` for details of how to update your own facade dependencies
    - Refer to the differences in `cdf-infrastructure-demo/deploy.bash` for details of how to update your own deploy script with the updated build process
