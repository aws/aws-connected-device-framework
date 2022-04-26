Feature: Patch Enhanced

  @setup_greengrass2_provisioning
  @setup_patch_features_enhanced
  Scenario: Setup
    Given patch template "ggv2_ec2_amazonlinux2_template" exists

  Scenario: Create a patch task to install a Greengrass Core software on a EC2 Simulated Edge Device
    Given patch template "ggv2_ec2_amazonlinux2_template" exists
    And I create an activation for "DevicePatcherIntegrationTestCore4" edge device
    When I launch an EC2 Instance "DevicePatcherIntegrationTestCore4" emulating as an edge device
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
      | type        | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
      | cores       | [{"name":"DevicePatcherIntegrationTestCore4","configFileGenerator":"MANUAL_INSTALL","provisioningTemplate":"Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters":{"ThingName":"DevicePatcherIntegrationTestCore4"},"cdfProvisioningParameters":{"caId":"abf59375ce08f0782c2751ea63c09d78f3920d0724ebf4a5d092e5e72567587f","certInfo":{"country":"US"}}}] |
    And I pause for 280000ms
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore4" exists with attributes:
      | $.name          | DevicePatcherIntegrationTestCore4 |
    And I create a patch patch Task for "DevicePatcherIntegrationTestCore4" edge device using "ggv2_ec2_amazonlinux2_template" template
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore4" exists
    And I pause for 280000ms
    Then patch for "DevicePatcherIntegrationTestCore4" exists with following attributes
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].deviceId             | DevicePatcherIntegrationTestCore4                                                       |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].patchId              | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].patchType            | agentbased                                                                             |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].patchStatus          | success                                                                                |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore4")].associationId        | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |

  @teardown_patch_features_enhanced
  Scenario: Teardown
    Given patch template "ggv2_ec2_amazonlinux2_template" does not exist