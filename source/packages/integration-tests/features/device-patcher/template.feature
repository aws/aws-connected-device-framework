Feature: Device Patch Deployment Template

  @setup_deployment_templates_features
  Scenario: Setup
    Given device-patch-deployment template "test-deployment-template" does not exist

  Scenario: Create a device-patch-deployment template "test-patch-template"
    Given device-patch-deployment template "test-deployment-template" does not exist
    When I create device-patch-deployment template "test-deployment-template" with attributes
      | description    | Test Device Patch Template                                      |
      | deploymentType | agentbased                                                      |
      | playbookName   | integration-test-playbook.yaml                                  |
      | extraVars      | { "commonVar1": "commonVarVal1", "commonVar2": "commonVarVal2"} |
    Then  device-patch-deployment template "test-deployment-template" exists with attributes
      | $.name                  | test-deployment-template                                               |
      | $.versionNo             | 1                                                                      |
      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.description           | Test Device Patch Template                                             |
      | $.deploymentType        | agentbased                                                               |
      | $.extraVars.commonVar1  | commonVarVal1                                                          |
      | $.extraVars.commonVar2  | commonVarVal2                                                          |

#  Scenario: Updating an existing device-patch-deployment template
#    Given device-patch-deployment template "test-patch-template" exists
#    When I update device-patch-deployment template "test-patch-template" with attributes
#      | description    | Description Update                                                              |
#      | extraVars      | { "commonVar1": "commonVarVal1Updated", "commonVar2": "commonVarVal2Updated"}   |
#    Then  device-patch-deployment template "test-patch-template" exists with attributes
#      | $.name                  | test-patch-template                                                    |
#      | $.versionNo             | 2                                                                      |
#      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
#      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
#      | $.description           | Description Update                                                     |
#      | $.deploymentType        | agentbased                                                             |
#      | $.playbookSource.type   | s3                                                                     |
#      | $.playbookSource.bucket | mybucket                                                               |
#      | $.playbookSource.prefix | device-patcher/test-playbook.yml                                       |
#      | $.extraVars.commonVar1  | commonVarVal1Updated                                                   |
#      | $.extraVars.commonVar2  | commonVarVal2Updated                                                   |

  Scenario: Delete a device-patch-deployment template "test-deployment-template"
    Given device-patch-deployment template "test-deployment-template" exists
    When I delete the device-patch-deployment template "test-deployment-template"
    Then device-patch-deployment template "test-deployment-template" does not exist

  Scenario: Get a device-patch-deployment template "test-patch-template1" which does not exist
    Given device-patch-deployment template "test-patch-template1" does not exist
    When I retrieve device-patch-deployment template "test-patch-template1"
    Then it fails with a 404

  @teardown_deployment_templates_feature
  Scenario: Teardown
    Given device-patch-deployment template "test_deployment_template" does not exist
