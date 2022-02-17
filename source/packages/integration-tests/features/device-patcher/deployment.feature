Feature: Device Patch Deployment

  @setup_deployment_features
  Scenario: Setup
    Given device-patch-deployment template "test_patch_template" exists

  Scenario: Create a deployment task for an edge device which isnt activated as a managed instance
    Given device-patch-deployment template "test_patch_template" exists
    When I create a patch deployment Task for "IntegrationTestCore1" edge device with attributes
      | deploymentTemplateName | test_patch_template                                                                              |
      | extraVars              | { "uniqueVar1": "uniqueVarVal1", "uniqueVar2": "uniqueVarVal2"}                         |
    Then deployment Task exists with following attributes
      | $.taskId                | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.createdAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.updatedAt             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
    And I pause for 3000ms
    And deployment exists for deployment Task with following attributes
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deviceId             | IntegrationTestCore1                                                                   |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentType       | agentbased                                                                             |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentStatus     | failed                                                                                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].statusMessage        | DEVICE_ACTIVATION_NOT_FOUND                                                            |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].associationId        | null                                                                                   |
    And last deployment for device exists with following attributes
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deviceId             | IntegrationTestCore1                                                                   |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentType       | agentbased                                                                             |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].deploymentStatus     | failed                                                                                 |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].statusMessage        | DEVICE_ACTIVATION_NOT_FOUND                                                            |
      | $.deployments[?(@.deviceId=="IntegrationTestCore1")].associationId        | null                                                                                   |


  Scenario: Create a deployment task for an EC2 Simulated edge device
    Given device-patch-deployment template "test_patch_template" exists
    And I create an activation for "ec2_edge_device_01" edge device
    When I launch an EC2 Instance "ec2_edge_device_01" emulating as an edge device
    And I pause for 120000ms
    When I create a patch deployment Task for "ec2_edge_device_01" edge device with attributes
      | deploymentTemplateName | test_patch_template                                             |
      | extraVars              | { "uniqueVar1": "uniqueVarVal1", "uniqueVar2": "uniqueVarVal2"} |
    And I pause for 40000ms
    And last deployment for device exists with following attributes
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].deviceId             | ec2_edge_device_01                                                                     |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].deploymentId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].extraVars.uniqueVar1 | uniqueVarVal1                                                                          |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].extraVars.uniqueVar2 | uniqueVarVal2                                                                          |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].deploymentType       | agentbased                                                                             |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].deploymentStatus     | success                                                                                |
      | $.deployments[?(@.deviceId=="ec2_edge_device_01")].associationId        | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |

  @teardown_deployment_features
  Scenario: Teardown
    Given device-patch-deployment template "test_patch_template" does not exist
