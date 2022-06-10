Feature: Device Patching

  @setup_patch_features
  Scenario: Setup
    Given patch template "integration_test_template" exists

  Scenario: Create a patch task for an edge device which isnt activated as a managed instance
    Given patch template "integration_test_template" exists
    When I create a patch Task for "IntegrationTestCore1" edge device with attributes
      | patchTemplateName | integration_test_template                                                               |
      | extraVars              | { "uniqueVar1": "uniqueVarVal1", "uniqueVar2": "uniqueVarVal2"}                         |
    Then patch Task exists with following attributes
      | $.taskId                | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
    And I pause for 3000ms
    And patch exists for patch Task with following attributes
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].deviceId             | IntegrationTestCore1                                                                   |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchType       | agentbased                                                                             |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchStatus     | failed                                                                                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].statusMessage        | DEVICE_ACTIVATION_NOT_FOUND                                                            |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].associationId        | null                                                                                   |
    And last patch for device exists with following attributes
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].deviceId             | IntegrationTestCore1                                                                   |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchType       | agentbased                                                                             |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].patchStatus     | failed                                                                                 |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].statusMessage        | DEVICE_ACTIVATION_NOT_FOUND                                                            |
      | $.patches[?(@.deviceId=="IntegrationTestCore1")].associationId        | null                                                                                   |


  Scenario: Create a patch task for an EC2 Simulated edge device
    Given patch template "integration_test_template" exists
    And I create an activation for "ec2_edge_device_01" edge device
    When I launch an EC2 Instance "ec2_edge_device_01" emulating as an edge device
    And I pause for 180000ms
    When I create a patch Task for "ec2_edge_device_01" edge device with attributes
      | patchTemplateName | integration_test_template                                       |
      | extraVars              | { "uniqueVar1": "uniqueVarVal1", "uniqueVar2": "uniqueVarVal2"} |
    And I pause for 120000ms
    And last patch for device exists with following attributes
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].deviceId             | ec2_edge_device_01                                                                     |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].patchId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].patchType       | agentbased                                                                             |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].patchStatus     | success                                                                                |
      | $.patches[?(@.deviceId=="ec2_edge_device_01")].associationId        | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |

  @teardown_patch_features
  Scenario: Teardown
    Given patch template "integration_test_template" does not exist
