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

Feature: Organization Manager Components Mapping

    @setup_organizationmanager_feature
    Scenario: Setup
        Given organizational unit "ou-55555" exists
        And organizational unit "ou-66666" exists
        And organizational unit "ou-55555" has 0 components
        And organizational unit "ou-66666" has 0 components

    Scenario: Mapping Components to Organizational Unit
        Given organizational unit "ou-55555" exists
        And organizational unit "ou-66666" exists
        When I load these components to organizational unit "ou-55555"
            | components | [ { "name": "cdf-openssl-layer", "runOrder": 1, "resourceFile": "s3://bucket-location-1/cfn-openssl-layer.template", "description": "test description 1.","bypassCheck": true, "parameters": { "Environment": "development"}}, { "name": "cdf-deployment-helper", "runOrder": 1, "resourceFile": "s3://bucket-location-1/cfn-openssl-layer.template", "description": "test description 1.","bypassCheck": true, "parameters": { "Environment": "development"}}] |
        Then organizational unit "ou-55555" has 2 components
        When I load these components to organizational unit "ou-66666"
            | components | [ { "name": "cdf-provisioning", "runOrder": 1, "resourceFile": "s3://bucket-location-1/cfn-provisioning.template", "description": "test description 1.","bypassCheck": true, "parameters": { "Environment": "development"}}] |
        Then organizational unit "ou-66666" has 1 components

    Scenario: Delete Component Mappings from Organizational Unit
        Given organizational unit "ou-55555" exists
        And organizational unit "ou-55555" has 2 components
        When I bulk delete the components from organizational unit "ou-55555"
        Then organizational unit "ou-55555" has 0 components

    Scenario: Mapping Components to Organizational Unit
        Given organizational unit "ou-55555" exists
        When I load these components to organizational unit "ou-55555"
            | components | [ { "name": "cdf-openssl-layer", "runOrder": 1, "resourceFile": "s3://bucket-location-1/cfn-openssl-layer.template", "description": "test description 1.","bypassCheck": true, "parameters": { "Environment": "development"}}, { "name": "cdf-deployment-helper", "runOrder": 1, "resourceFile": "s3://bucket-location-1/cfn-deployment-helper.template", "description": "test description 1.","bypassCheck": true, "parameters": { "Environment": "development"}}] |
        And I create account with attributes
            | accountId            | 22222         |
            | name                 | test-account  |
            | organizationalUnitId | ou-55555      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | regions              | ["us-west-2"] |
        And I create account with attributes
            | accountId            | 33333         |
            | name                 | test-account  |
            | organizationalUnitId | ou-55555      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | regions              | ["us-west-2"] |
        And I create account with attributes
            | accountId            | 44444              |
            | name                 | test-account       |
            | organizationalUnitId | ou-66666           |
            | email                | test@test.com      |
            | ssoEmail             | test@test.com      |
            | ssoFirstName         | John               |
            | ssoLastName          | Doe                |
            | regions              | ["ap-southeast-2"] |
        Then Manifest file exists with attributes:
            | $.resources[0].name                           | cdf-deployment-helper-us-west-2                       |
            | $.resources[0].description                    | stack set for cdf-deployment-helper                   |
            | $.resources[0].regions[0]                     | us-west-2                                             |
            | $.resources[0].deployment_targets.accounts[0] | 22222                                                 |
            | $.resources[0].deployment_targets.accounts[1] | 33333                                                 |
            | $.resources[0].resource_file                  | s3://bucket-location-1/cfn-deployment-helper.template |
            | $.resources[1].name                           | cdf-openssl-layer-us-west-2                           |
            | $.resources[1].deployment_targets.accounts[0] | 22222                                                 |
            | $.resources[1].deployment_targets.accounts[1] | 33333                                                 |
            | $.resources[1].regions[0]                     | us-west-2                                             |
            | $.resources[1].resource_file                  | s3://bucket-location-1/cfn-openssl-layer.template     |
            | $.resources[2].name                           | cdf-provisioning-ap-southeast-2                       |
            | $.resources[2].deployment_targets.accounts[0] | 44444                                                 |
            | $.resources[2].regions[0]                     | ap-southeast-2                                        |
            | $.resources[2].resource_file                  | s3://bucket-location-1/cfn-provisioning.template      |

    @teardown_organizationmanager_feature
    Scenario: Teardown
        Given organizational unit "ou-55555" does not exists
        And organizational unit "ou-66666" does not exists
        And account "22222" does not exists
        And account "33333" does not exists
        And account "44444" does not exists
