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

Feature: Provisioning things using basic template functionality

  @setup_basic_provisioning
  Scenario: Setup
    Given thing "BasicIntegrationTestThing" does not exist

  Scenario: Provision a Thing
    Given thing "BasicIntegrationTestThing" does not exist
    When I provision a thing "BasicIntegrationTestThing" using a csr
    Then the thing "BasicIntegrationTestThing" is provisioned

  Scenario: Provision a Thing with AWS issued certificate
    Given thing "AwsIssuedIntegrationTestThing" does not exist
    When I provision a thing "AwsIssuedIntegrationTestThing" using aws iot certificate
    Then the thing "AwsIssuedIntegrationTestThing" is provisioned

  @teardown_basic_provisioning
  Scenario: Teardown
    Given thing "BasicIntegrationTestThing" does not exist
    And thing "AwsIssuedIntegrationTestThing" does not exist
