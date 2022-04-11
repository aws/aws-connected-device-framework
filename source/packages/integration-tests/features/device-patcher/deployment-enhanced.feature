Feature: Deployment Enhanced

  @setup_greengrass2_provisioning
  @setup_deployment_features
  Scenario: Setup
    Given device-patch-deployment template "ggv2-ec2-installer-template" exists

  Scenario: Create a deployment task to install a Greengrass Core software on a EC2 Simulated Edge Device
    Given device-patch-deployment template "ggv2-ec2-installer-template" exists
    And I create an activation for "DevicePatcherIntegrationTestCore" edge device
    When I launch an EC2 Instance "DevicePatcherIntegrationTestCore" emulating as an edge device
    And I pause for 120000ms
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore" does not exist
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
      | type        | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
      | cores       | [{"name":"DevicePatcherIntegrationTestCore","configFileGenerator":"MANUAL_INSTALL","provisioningTemplate":"Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters":{"ThingName":"DevicePatcherIntegrationTestCore"},"cdfProvisioningParameters":{"caId":"3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo":{"country":"US"}}}] |
    Then greengrass2-provisioning core task exists
    And I create a patch deployment Task for "DevicePatcherIntegrationTestCore" edge device using "ggv2-ec2-installer-template" template
    Then greengrass2-provisioning core device "DevicePatcherIntegrationTestCore" exists
    And I pause for 10000ms
    Then deployment for "DevicePatcherIntegrationTestCore" exists with following attributes
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].deviceId             | DevicePatcherIntegrationTestCore                                                       |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].deploymentId         | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].taskId               | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].createdAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].updatedAt            | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$                 |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].deploymentType       | agentbased                                                                             |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].deploymentStatus     | success                                                                                |
      | $.deployments[?(@.deviceId=="DevicePatcherIntegrationTestCore")].associationId        | ___regex___:^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$ |

  @teardown_deployment_features
  Scenario: Teardown
    Given device-patch-deployment template "ggv2-ec2-installer-template" does not exist