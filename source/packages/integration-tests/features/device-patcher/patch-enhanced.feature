Feature: Patch Enhanced

  @setup_greengrass2_provisioning
  @setup_patch_features_enhanced
  Scenario: Setup
    Given patch template "ggv2_ec2_amazonlinux2_template" exists

  Scenario: Create a patch task to install a Greengrass Core software on a EC2 Simulated Edge Device
    Given patch template "ggv2_ec2_amazonlinux2_template" exists
    And I create an activation for "DevicePatcherIntegrationTestCore" edge device
    When I launch an EC2 Instance "DevicePatcherIntegrationTestCore" emulating as an edge device
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
      | type        | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
      | cores       | [{"name":"DevicePatcherIntegrationTestCore","configFileGenerator":"MANUAL_INSTALL","provisioningTemplate":"Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters":{"ThingName":"DevicePatcherIntegrationTestCore"},"cdfProvisioningParameters":{"caId":"3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo":{"country":"US"}}}] |
    And I pause for 280000ms
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore" exists with attributes:
      | $.name          | DevicePatcherIntegrationTestCore |
    And I create a patch patch Task for "DevicePatcherIntegrationTestCore" edge device using "ggv2_ec2_amazonlinux2_template" template
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore" exists
    And I pause for 280000ms
    Then patch for "DevicePatcherIntegrationTestCore" exists with following attributes
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].deviceId             | DevicePatcherIntegrationTestCore                                                       |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].patchId              | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].patchType            | agentbased                                                                             |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].patchStatus          | success                                                                                |
      | $.patches[?(@.deviceId=="DevicePatcherIntegrationTestCore")].associationId        | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |

  @teardown_patch_features_enhanced
  Scenario: Teardown
    Given patch template "ggv2_ec2_amazonlinux2_template" does not exist