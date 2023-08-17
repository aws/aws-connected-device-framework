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

Feature: Provisioning things using ACM PCA template functionality

  @setup_acmpca_provisioning
  Scenario: Setup
    Given thing "ACMPCAIntegrationTestThing" does not exist

##### Note: following commented out as the environment needs a real ACMPCA cert to test with:
#  Scenario: Provision a Thing
#    Given thing "ACMPCAIntegrationTestThing" does not exist
#    When I provision a thing "ACMPCAIntegrationTestThing" using acmpca
#    Then the thing "ACMPCAIntegrationTestThing" is provisioned

  @teardown_acmpca_provisioning
  Scenario: Teardown
    Given thing "ACMPCAIntegrationTestThing" does not exist
