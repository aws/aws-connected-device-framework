Feature: GreengrassV2 Provisioning

  @setup_greengrass2_provisioning
  Scenario: Setup
    Given greengrass2-provisioning template "IntegrationTest" does not exist
    And I pause for 10000ms
    And greengrass2-provisioning core device "IntegrationTestCore1" does not exist
    And greengrass2-provisioning core device "IntegrationTestCore2" does not exist

  Scenario: Create a template
    Given greengrass2-provisioning template "IntegrationTest" does not exist
    When I create greengrass2-provisioning template "IntegrationTest" with attributes:
      | name       | IntegrationTest                                    |
      | components | [{"key": "aws.greengrass.Cli","version": "2.4.0"}] |
    Then greengrass2-provisioning template "IntegrationTest" exists with attributes:
      | $.name                                                | IntegrationTest                                                        |
      | $.version                                             | 1                                                                      |
      | $.components.length                                   | 1                                                                      |
      | $.components.[?(@.key=="aws.greengrass.Cli")].version | 2.4.0                                                                  |
      | $.createdAt                                           | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Create client device with invalid core
    Given greengrass2-provisioning client device "ClientDevice1" does not exist
    When I create greengrass2-provisioning client device task with invalid attributes:
      | coreName | IntegrationTestCore1                                                                                                                                                                                                                                                                                   |
      | type     | Create                                                                                                                                                                                                                                                                                                 |
      | devices  | [{"name": "ClientDevice1", "provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "ClientDevice1"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}] |
    Then last greengrass2-provisioning client device task fails with a 400

  Scenario: Create 2 cores
    Given greengrass2-provisioning core device "IntegrationTestCore1" does not exist
    And greengrass2-provisioning core device "IntegrationTestCore2" does not exist
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
      | type        | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
      | cores       | [{"name": "IntegrationTestCore1", "configFileGenerator": "MANUAL_INSTALL", "provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "IntegrationTestCore1"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}, {"name": "IntegrationTestCore2","provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "IntegrationTestCore2"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}] |
    And I pause for 10000ms
    Then last greengrass2-provisioning core task exists with attributes:
      | $.id                                                  | ___regex___:^[A-Za-z0-9_\-]{9}$                                        |
      | $.taskStatus                                          | Success                                                                |
      | $.createdAt                                           | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                                           | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.cores[?(@.name=="IntegrationTestCore1")].name       | IntegrationTestCore1                                                   |
      | $.cores[?(@.name=="IntegrationTestCore1")].taskStatus | Success                                                                |
      | $.cores[?(@.name=="IntegrationTestCore1")].createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.cores[?(@.name=="IntegrationTestCore1")].updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.cores[?(@.name=="IntegrationTestCore2")].name       | IntegrationTestCore2                                                   |
      | $.cores[?(@.name=="IntegrationTestCore2")].taskStatus | Success                                                                |
      | $.cores[?(@.name=="IntegrationTestCore2")].createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.cores[?(@.name=="IntegrationTestCore2")].updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    Then config file for "IntegrationTestCore1" exists with attributes:
      | $.system.thingName                           | IntegrationTestCore1 |
      | $.services['aws.greengrass.Nucleus'].version | 2.4.0                |
    Then config file for "IntegrationTestCore2" should not exists


  Scenario: Creating core with invalid provisioning template
    Given greengrass2-provisioning core device "IntegrationTestCore3" does not exist
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
      | type        | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
      | cores       | [{"name": "IntegrationTestCore3", "configFileGenerator": "MANUAL_INSTALL", "provisioningTemplate": "invalidtemplate","provisioningParameters": {"ThingName": "IntegrationTestCore1"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}, {"name": "IntegrationTestCore2","provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "IntegrationTestCore2"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}] |
    And I pause for 5000ms
    Then last greengrass2-provisioning core task exists with attributes:
      | $.id         | ___regex___:^[A-Za-z0-9_\-]{9}$                                        |
      | $.taskStatus | Failure                                                                |
      | $.createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Provision a greengrass core device within EC2
    Given greengrass2-provisioning core device "IntegrationTestCore1" exists with attributes:
      | $.name          | IntegrationTestCore1 |
      | $.device.status | UNKNOWN              |
    When I install new greengrass2-provisioning core device "IntegrationTestCore1" on EC2
    And I wait until greengrass2-provisioning core device "IntegrationTestCore1" is "HEALTHY"
    Then greengrass2-provisioning core device "IntegrationTestCore1" exists with attributes:
      | $.name          | IntegrationTestCore1 |
      | $.device.status | HEALTHY              |

  Scenario: Deploy template to core devices
    A deployment to IntegrationTestCore1 should be successful as we installed it on EC2, whereas IntegrationTestCore2
    should fail as their is no physical core registered with Greengrass V2 yet (needs powering on to self register).
    Given greengrass2-provisioning template "IntegrationTest" exists
    And greengrass2-provisioning core device "IntegrationTestCore1" exists
    And greengrass2-provisioning core device "IntegrationTestCore2" exists
    When I create greengrass2-provisioning deployment task with attributes:
      | template | {"name":"IntegrationTest"}                                      |
      | targets  | {"thingNames": ["IntegrationTestCore1","IntegrationTestCore2"]} |
    And I pause for 10000ms
    Then last greengrass2-provisioning deployment task exists with attributes:
      | $.id                                                            | ___regex___:^[A-Za-z0-9_\-]{9}$                                        |
      | $.template.name                                                 | IntegrationTest                                                        |
      | $.template.version                                              | 1                                                                      |
      | $.targets.thingNames.length                                     | 2                                                                      |
      | $.targets.thingNames[0]                                         | IntegrationTestCore1                                                   |
      | $.targets.thingNames[1]                                         | IntegrationTestCore2                                                   |
      | $.deployments.length                                            | 2                                                                      |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].taskStatus | Success                                                                |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.deployments[?(@.coreName=="IntegrationTestCore2")].taskStatus | Failure                                                                |
      | $.deployments[?(@.coreName=="IntegrationTestCore2")].createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.deployments[?(@.coreName=="IntegrationTestCore2")].updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.taskStatus                                                    | Failure                                                                |
      | $.createdAt                                                     | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                                                     | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    And I pause for 10000ms
    Then fleet summary should be updated with this attributes:
      | $.templates.IntegrationTest.latestVersion                    | 1 |
      | $.templates.IntegrationTest.versions.1.desiredInUse          | 2 |
      | $.templates.IntegrationTest.versions.1.lastDeploymentSuccess | 1 |
      | $.templates.IntegrationTest.versions.1.lastDeploymentFailed  | 1 |

  Scenario: Create 2 client devices
    Given greengrass2-provisioning client device "ClientDevice1" does not exist
    And greengrass2-provisioning client device "ClientDevice2" does not exist
    When I create greengrass2-provisioning client device task with attributes:
      | coreName | IntegrationTestCore1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
      | type     | Create                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
      | devices  | [{"name": "ClientDevice1", "provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "ClientDevice1"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}, {"name": "ClientDevice2","provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "ClientDevice2"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}] |
    And I pause for 10000ms
    Then last greengrass2-provisioning client device task exists with attributes:
      | $.id         | ___regex___:^[A-Za-z0-9_\-]{9}$                                        |
      | $.taskStatus | Success                                                                |
      | $.createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    Then greengrass2-provisioning client device "ClientDevice1" exists with attributes:
      | $.name     | ClientDevice1        |
      | $.coreName | IntegrationTestCore1 |
    Then greengrass2-provisioning client device "ClientDevice2" exists with attributes:
      | $.name     | ClientDevice2        |
      | $.coreName | IntegrationTestCore1 |
    Then device "ClientDevice1" should be associated with greengrass2 core "IntegrationTestCore1"
    Then device "ClientDevice2" should be associated with greengrass2 core "IntegrationTestCore1"

  Scenario: Delete Client Device
    Given greengrass2-provisioning client device "ClientDevice1" exists with attributes:
      | $.name     | ClientDevice1        |
      | $.coreName | IntegrationTestCore1 |
    When I delete client device "ClientDevice1"
    Then device "ClientDevice1" should not be associated with greengrass2 core "IntegrationTestCore1"


  Scenario: Update existing template
    Given greengrass2-provisioning template "IntegrationTest" exists with attributes:
      | $.name    | IntegrationTest |
      | $.version | 1               |
    When I update greengrass2-provisioning template "IntegrationTest" with attributes:
      | name       | IntegrationTest                                                                                                             |
      | components | [{"key": "aws.greengrass.Cli","version": "2.4.0"},{ "key": "aws.greengrass.clientdevices.IPDetector", "version": "2.1.1" }] |
    Then greengrass2-provisioning template "IntegrationTest" exists with attributes:
      | $.name                                                                     | IntegrationTest                                                        |
      | $.version                                                                  | 2                                                                      |
      | $.components.length                                                        | 2                                                                      |
      | $.components.[?(@.key=="aws.greengrass.clientdevices.IPDetector")].version | 2.1.1                                                                  |
      | $.createdAt                                                                | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Deploy updated template to core devices
    A deployment to IntegrationTestCore1 should be successful as we installed it on EC2
    Given greengrass2-provisioning template "IntegrationTest" exists with attributes:
      | $.name    | IntegrationTest |
      | $.version | 2               |
    And greengrass2-provisioning core device "IntegrationTestCore1" exists
    When I create greengrass2-provisioning deployment task with attributes:
      | template | {"name":"IntegrationTest", "version" : "2"} |
      | targets  | {"thingNames": ["IntegrationTestCore1"]}    |
    And I pause for 5000ms
    Then last greengrass2-provisioning deployment task exists with attributes:
      | $.id                                                            | ___regex___:^[A-Za-z0-9_\-]{9}$                                        |
      | $.template.name                                                 | IntegrationTest                                                        |
      | $.template.version                                              | 2                                                                      |
      | $.targets.thingNames.length                                     | 1                                                                      |
      | $.targets.thingNames[0]                                         | IntegrationTestCore1                                                   |
      | $.deployments.length                                            | 1                                                                      |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].taskStatus | Success                                                                |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.deployments[?(@.coreName=="IntegrationTestCore1")].updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.taskStatus                                                    | Success                                                                |
      | $.createdAt                                                     | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                                                     | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    And I pause for 60000ms
    Then fleet summary should be updated with this attributes:
      | $.templates.IntegrationTest.latestVersion                    | 2 |
      | $.templates.IntegrationTest.versions.2.desiredInUse          | 1 |
      | $.templates.IntegrationTest.versions.2.lastDeploymentSuccess | 1 |
      | $.templates.IntegrationTest.versions.2.lastDeploymentFailed  | 0 |

  Scenario: Delete Greengrass Core
    Given greengrass2-provisioning core device "IntegrationTestCore1" exists
    When I create greengrass2-provisioning core task with attributes:
      | coreVersion | 2.4.0                                                                                                                                                                                                                                                                                                                                                         |
      | type        | Delete                                                                                                                                                                                                                                                                                                                                                        |
      | options     | {"deprovisionCores":true, "deprovisionClientDevices": true }                                                                                                                                                                                                                                                                                                  |
      | cores       | [{"name": "IntegrationTestCore1", "configFileGenerator": "MANUAL_INSTALL", "provisioningTemplate": "Greengrass2IntegrationTestProvisioningTemplate","provisioningParameters": {"ThingName": "IntegrationTestCore1"},"cdfProvisioningParameters": {"caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32","certInfo": {"country": "US"}}}] |
    And I pause for 10000ms
    Then greengrass2-provisioning core device "IntegrationTestCore1" does not exist
    Then greengrass2-provisioning client device "ClientDevice2" does not exist


  @teardown_greengrass2_provisioning
  Scenario: Teardown
    Given I pause for 10000ms
    Given greengrass2-provisioning template "IntegrationTest" does not exist
    Given greengrass2-provisioning core device "IntegrationTestCore1" does not exist
    And greengrass2-provisioning core device "IntegrationTestCore2" does not exist
