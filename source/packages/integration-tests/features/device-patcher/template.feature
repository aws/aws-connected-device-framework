Feature: Device Patch Template

  @setup_patch_templates_features
  Scenario: Setup
    Given patch template "test-patch-template" does not exist

  Scenario: Create a device patch template "test-patch-template"
    Given patch template "test-patch-template" does not exist
    When I create patch template "test-patch-template" with attributes
      | description    | Test Device Patch Template                                      |
      | patchType      | agentbased                                                      |
      | extraVars      | { "commonVar1": "commonVarVal1", "commonVar2": "commonVarVal2"} |
    Then  patch template "test-patch-template" exists with attributes
      | $.name                  | test-patch-template                                               |
      | $.versionNo             | 1                                                                      |
      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.description           | Test Device Patch Template                                             |
      | $.patchType             | agentbased                                                             |
      | $.extraVars.commonVar1  | commonVarVal1                                                          |
      | $.extraVars.commonVar2  | commonVarVal2                                                          |

  Scenario: Updating an existing patch template
    Given patch template "test-patch-template" exists
    When I update patch template "test-patch-template" with attributes
      | description    | Description Update                                                              |
      | extraVars      | { "commonVar1": "commonVarVal1Updated", "commonVar2": "commonVarVal2Updated"}   |
    Then  patch template "test-patch-template" exists with attributes
      | $.name                  | test-patch-template                                                    |
      | $.versionNo             | 2                                                                      |
      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.description           | Description Update                                                     |
      | $.patchType             | agentbased                                                             |
      | $.extraVars.commonVar1  | commonVarVal1Updated                                                   |
      | $.extraVars.commonVar2  | commonVarVal2Updated                                                   |

  Scenario: Delete a patch template "test-patch-template"
    Given patch template "test-patch-template" exists
    When I delete the patch template "test-patch-template"
    Then patch template "test-patch-template" does not exist

  Scenario: Get a patch template "test-patch-template1" which does not exist
    Given patch template "test-patch-template1" does not exist
    When I retrieve patch template "test-patch-template1"
    Then it fails with a 404

  @teardown_patch_templates_feature
  Scenario: Teardown
    Given patch template "test_patch_template" does not exist
