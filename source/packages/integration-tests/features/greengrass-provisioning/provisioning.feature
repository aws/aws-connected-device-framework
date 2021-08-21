Feature: Provisioning Greengrass Groups

  @setup_greengrass_provisioning
  Scenario: Setup
    Given thing "IntegrationTestGroup1-Core" does not exist
    And thing "IntegrationTestGroup1-Device1" does not exist
    And greengrass-provisioning group "IntegrationTestGroup1" does not exist
    And greengrass-provisioning group "IntegrationTestGroup2" does not exist
    And greengrass-provisioning group "IntegrationTestTemplateGroup" does not exist
    And greengrass-provisioning template "IntegrationTestTemplate" does not exist

  Scenario: Create a template
    Given greengrass-provisioning group "IntegrationTestTemplateGroup" does not exist
    And greengrass-provisioning template "IntegrationTestTemplate" does not exist
    When I create greengrass group "IntegrationTestTemplateGroup" with attributes:
      | functions | [{"Id": "func_1", "FunctionArn": "arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1","FunctionConfiguration": {"Environment": {"Variables": { "VAR_1": "${coreThingName}_${coreThingType}_${coreThingArn}" }},"MemorySize": 16384,"Pinned": false,"Timeout": 3}}] |
      | subscriptions | [{"Id": "sub_1","Source": "arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1","Subject": "incoming/v1","Target": "cloud"}, {"Id": "sub_2","Source": "cloud","Subject": "outgoing/v1","Target": "arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1"}] |
    And I create greengrass template "IntegrationTestTemplate" from group "IntegrationTestTemplateGroup" with attributes:
      | subscriptions | {"__all":[{"id":"sub_${thingName}_outgoing","source":"${thingArn}","subject":"dt/${thingName}/v1","target":"cloud"},{"id":"sub_${thingName}_incoming","source":"cloud","subject":"cmd/${thingName}/v1","target":"${thingArn}"}],"IntegrationTestCore":[{"id":"sub_${thingName}_core","source":"${thingArn}","subject":"dt/${thingName}/core/v1","target":"cloud"}]} |
    Then greengrass-provisioning template "IntegrationTestTemplate" exists with attributes:
      | $.name | IntegrationTestTemplate |
      | $.subscriptions.IntegrationTestCore.length | 1 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].source | ${thingArn} |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].subject | dt/${thingName}/core/v1 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].target | cloud |
      | $.subscriptions.__all.length | 2 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_outgoing")].source | ${thingArn} |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_outgoing")].subject | dt/${thingName}/v1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_outgoing")].target | cloud |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].source | cloud |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].subject | cmd/${thingName}/v1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].target | ${thingArn} |

  Scenario: Create 2 groups from the template
    Given greengrass-provisioning template "IntegrationTestTemplate" exists
    And greengrass-provisioning group "IntegrationTestGroup1" does not exist
    And greengrass-provisioning group "IntegrationTestGroup2" does not exist
    When I create greengrass-provisioning group task with attributes:
      | groups | [{"name": "IntegrationTestGroup1","templateName": "IntegrationTestTemplate"}, {"name": "IntegrationTestGroup2","templateName": "IntegrationTestTemplate"}] |
    And I pause for 5000ms
    Then last greengrass-provisioning group task exists with attributes:
      | $.taskId | ___regex___:^[A-Za-z0-9_\-]{9}$ |
      | $.taskStatus | Success |
      | $.type | Create |
      | $.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].name | IntegrationTestGroup1 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].taskStatus | Success |
      | $.groups[?(@.name=="IntegrationTestGroup1")].id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionNo | 1 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].arn | ___regex___:^arn:aws:greengrass:%property:aws.region%:%property:aws.accountId%:\/greengrass\/groups\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateName | IntegrationTestTemplate |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateVersionNo | 1 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup2")].name | IntegrationTestGroup2 |
      | $.groups[?(@.name=="IntegrationTestGroup2")].taskStatus | Success |
      | $.groups[?(@.name=="IntegrationTestGroup2")].id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup2")].versionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup2")].versionNo | 1 |
      | $.groups[?(@.name=="IntegrationTestGroup2")].arn | ___regex___:^arn:aws:greengrass:%property:aws.region%:%property:aws.accountId%:\/greengrass\/groups\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})$ |
      | $.groups[?(@.name=="IntegrationTestGroup2")].templateName | IntegrationTestTemplate |
      | $.groups[?(@.name=="IntegrationTestGroup2")].templateVersionNo | 1 |
      | $.groups[?(@.name=="IntegrationTestGroup2")].createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup2")].updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    And greengrass group "IntegrationTestGroup1" exists with attributes:
      | $.Id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.Name | IntegrationTestGroup1 |
      | $.tags.cdf_template | IntegrationTestTemplate |
      | $.tags.cdf_template_version | 1 |
    And greengrass group "IntegrationTestGroup1" function definition exists with attributes:
      | $.Definition.Functions.length | 1 |
      | $.Definition.Functions[?(@.Id=="func_1")].Id | func_1 |
      | $.Definition.Functions[?(@.Id=="func_1")].FunctionArn | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
    And greengrass group "IntegrationTestGroup1" subscription definition exists with attributes:
      | $.Definition.Subscriptions.length | 2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Id | sub_1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Source | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Subject | incoming/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Id | sub_2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Subject | outgoing/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Target | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |

  Scenario: Add a core and a device to group IntegrationTestGroup1
    Given greengrass-provisioning group "IntegrationTestGroup1" exists
    And thing "IntegrationTestGroup1-Core" does not exist
    And thing "IntegrationTestGroup1-Device1" does not exist
    When I add devices to greengrass-provisioning group "IntegrationTestGroup1" with attributes:
      | devices | [{"thingName":"IntegrationTestGroup1-Core","type":"core","provisioningTemplate":"GreengrassIntegrationTestTemplate","provisioningParameters":{"ThingName":"IntegrationTestGroup1-Core","ThingType":"IntegrationTestCore"},"cdfProvisioningParameters":{"caId":"%property:greengrassProvisioning.caId%","certInfo":{"country":"US"}}},{"thingName":"IntegrationTestGroup1-Device1","type":"device","provisioningTemplate":"GreengrassIntegrationTestTemplate","provisioningParameters":{"ThingName":"IntegrationTestGroup1-Device1","ThingType":"IntegrationTestDevice"},"cdfProvisioningParameters":{"caId":"%property:greengrassProvisioning.caId%","certInfo":{"country":"US"}}}] |
    And I pause for 10000ms
    Then last greengrass-provisioning devices task exists with attributes:
      | $.taskId | ___regex___:^[A-Za-z0-9_\-]{9}$ |
      | $.groupName | IntegrationTestGroup1 |
      | $.status | Success |
      | $.statusMessage | ___undefined___ |
      | $.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].thingName | IntegrationTestGroup1-Core |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].type | core |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].status | Success |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].syncShadow | true |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.certs.bucket | %property:provisioning.templates.bucket% |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.certs.key | ___regex___:^greengrass\/certificates\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})\/IntegrationTestGroup1-Core\/certs.zip$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.certs.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.config.bucket | %property:provisioning.templates.bucket% |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.config.key | ___regex___:^greengrass\/certificates\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})\/IntegrationTestGroup1-Core\/greengrassCoreConfig.zip$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Core")].artifacts.config.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].thingName | IntegrationTestGroup1-Device1 |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].type | device |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].status | Success |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].syncShadow | true |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].artifacts.certs.bucket | %property:provisioning.templates.bucket% |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].artifacts.certs.key | ___regex___:^greengrass\/certificates\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})\/IntegrationTestGroup1-Device1\/certs.zip$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].artifacts.certs.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.devices[?(@.thingName=="IntegrationTestGroup1-Device1")].artifacts.config | ___undefined___ |
    And greengrass group "IntegrationTestGroup1" core definition exists with attributes:
      | $.Definition.Cores.length | 1 |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" device definition exists with attributes:
      | $.Definition.Devices.length | 1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" subscription definition exists with attributes:
      | $.Definition.Subscriptions.length | 7 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Id | sub_1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Source | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Subject | incoming/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Id | sub_2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Subject | outgoing/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Target | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Subject | dt/IntegrationTestGroup1-Core/core/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Subject | dt/IntegrationTestGroup1-Core/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Subject | cmd/IntegrationTestGroup1-Core/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_outgoing")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_outgoing")].Subject | dt/IntegrationTestGroup1-Device1/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_outgoing")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Subject | cmd/IntegrationTestGroup1-Device1/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |
    And greengrass group "IntegrationTestGroup1" function definition exists with attributes:
      | $.Definition.Functions.length | 1 |
      | $.Definition.Functions[?(@.Id=="func_1")].Id | func_1 |
      | $.Definition.Functions[?(@.Id=="func_1")].FunctionArn | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Functions[?(@.Id=="func_1")].FunctionConfiguration.Environment.Variables.VAR_1 | ___regex___:^IntegrationTestGroup1-Core_IntegrationTestCore_arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing\/.*$ |

  Scenario: Update the template by modifying the device subscription templates
    Given greengrass-provisioning template "IntegrationTestTemplate" exists
    When I update greengrass-provisioning template "IntegrationTestTemplate" with attributes:
      | subscriptions | {"__all":[{"id":"sub_${thingName}_incoming","source":"cloud","subject":"cmd/${thingName}/v1","target":"${thingArn}"}],"IntegrationTestCore":[{"id":"sub_${thingName}_core","source":"${thingArn}","subject":"dt/${thingName}/core/v2","target":"cloud"},{"id":"sub_${thingName}_outgoing","source":"${thingArn}","subject":"dt/${thingName}/v2","target":"cloud"}]} |
    Then greengrass-provisioning template "IntegrationTestTemplate" exists with attributes:
      | $.name | IntegrationTestTemplate |
      | $.versionNo | 2 |
      | $.groupId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groupVersionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.subscriptions.IntegrationTestCore.length | 2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].source | ${thingArn} |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].subject | dt/${thingName}/core/v2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].target | cloud |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].source | ${thingArn} |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].subject | dt/${thingName}/v2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].target | cloud |
      | $.subscriptions.__all.length | 1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].source | cloud |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].subject | cmd/${thingName}/v1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].target | ${thingArn} |

  Scenario: Update group to latest template version (device subscription template change)
    Given greengrass-provisioning template "IntegrationTestTemplate" exists
    And greengrass-provisioning group "IntegrationTestGroup1" exists
    When I update greengrass-provisioning group task with attributes:
      | groups | [{"name": "IntegrationTestGroup1","templateName": "IntegrationTestTemplate"}] |
    And I pause for 5000ms
    Then last greengrass-provisioning group task exists with attributes:
      | $.taskId | ___regex___:^[A-Za-z0-9_\-]{9}$ |
      | $.taskStatus | Success |
      | $.type | Update |
      | $.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].name | IntegrationTestGroup1 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].taskStatus | Success |
      | $.groups[?(@.name=="IntegrationTestGroup1")].id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionNo | 3 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].arn | ___regex___:^arn:aws:greengrass:%property:aws.region%:%property:aws.accountId%:\/greengrass\/groups\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})\/versions\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateName | IntegrationTestTemplate |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateVersionNo | 2 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    And greengrass group "IntegrationTestGroup1" exists with attributes:
      | $.Id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.Name | IntegrationTestGroup1 |
      | $.tags.cdf_template | IntegrationTestTemplate |
      | $.tags.cdf_template_version | 1 |
    And greengrass group "IntegrationTestGroup1" function definition exists with attributes:
      | $.Definition.Functions.length | 1 |
      | $.Definition.Functions[?(@.Id=="func_1")].Id | func_1 |
      | $.Definition.Functions[?(@.Id=="func_1")].FunctionArn | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
    And greengrass group "IntegrationTestGroup1" core definition exists with attributes:
      | $.Definition.Cores.length | 1 |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" device definition exists with attributes:
      | $.Definition.Devices.length | 1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" subscription definition exists with attributes:
      | $.Definition.Subscriptions.length | 6 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Id | sub_1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Source | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Subject | incoming/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Id | sub_2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Subject | outgoing/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Target | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Subject | dt/IntegrationTestGroup1-Core/core/v2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Subject | dt/IntegrationTestGroup1-Core/v2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Subject | cmd/IntegrationTestGroup1-Core/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Subject | cmd/IntegrationTestGroup1-Device1/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |

  Scenario: Update the template by modifying the underlying greengrass group
    Given greengrass-provisioning template "IntegrationTestTemplate" exists
    When I update greengrass group "IntegrationTestTemplateGroup" with attributes:
      | functions | [{"Id": "func_2", "FunctionArn": "arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1","FunctionConfiguration": {"Environment": {"Variables": { "VAR_2": "${coreThingName}_${coreThingType}_${coreThingArn}" }},"MemorySize": 16384,"Pinned": false,"Timeout": 10}}] |
      | subscriptions | [{"Id":"sub_1","Source":"arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1","Subject":"incoming/v1","Target":"cloud"},{"Id":"sub_2","Source":"cloud","Subject":"outgoing/v2","Target":"arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1"},{"Id":"sub_3","Source":"cloud","Subject":"outgoing/v3","Target":"arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1"}] |
    And I update greengrass-provisioning template "IntegrationTestTemplate" with attributes:
      | subscriptions | {"__all":[{"id":"sub_${thingName}_incoming","source":"cloud","subject":"cmd/${thingName}/v1","target":"${thingArn}"}],"IntegrationTestCore":[{"id":"sub_${thingName}_core","source":"${thingArn}","subject":"dt/${thingName}/core/v2","target":"cloud"},{"id":"sub_${thingName}_outgoing","source":"${thingArn}","subject":"dt/${thingName}/v2","target":"cloud"}]} |
    Then greengrass-provisioning template "IntegrationTestTemplate" exists with attributes:
      | $.name | IntegrationTestTemplate |
      | $.versionNo | 3 |
      | $.groupId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groupVersionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.subscriptions.IntegrationTestCore.length | 2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].source | ${thingArn} |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].subject | dt/${thingName}/core/v2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_core")].target | cloud |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].source | ${thingArn} |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].subject | dt/${thingName}/v2 |
      | $.subscriptions.IntegrationTestCore[?(@.id=="sub_${thingName}_outgoing")].target | cloud |
      | $.subscriptions.__all.length | 1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].source | cloud |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].subject | cmd/${thingName}/v1 |
      | $.subscriptions.__all[?(@.id=="sub_${thingName}_incoming")].target | ${thingArn} |

  Scenario: Update group to explicit (latest) template version (underlying greengrass group template change)
    Given greengrass-provisioning template "IntegrationTestTemplate" exists
    And greengrass-provisioning group "IntegrationTestGroup1" exists
    When I update greengrass-provisioning group task with attributes:
      | groups | [{"name": "IntegrationTestGroup1","templateName": "IntegrationTestTemplate","templateVersionNo":3}] |
    And I pause for 5000ms
    Then last greengrass-provisioning group task exists with attributes:
      | $.taskId | ___regex___:^[A-Za-z0-9_\-]{9}$ |
      | $.taskStatus | Success |
      | $.type | Update |
      | $.createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].name | IntegrationTestGroup1 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].taskStatus | Success |
      | $.groups[?(@.name=="IntegrationTestGroup1")].id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].versionNo | 4 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].arn | ___regex___:^arn:aws:greengrass:%property:aws.region%:%property:aws.accountId%:\/greengrass\/groups\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})\/versions\/([A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateName | IntegrationTestTemplate |
      | $.groups[?(@.name=="IntegrationTestGroup1")].templateVersionNo | 3 |
      | $.groups[?(@.name=="IntegrationTestGroup1")].createdAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.groups[?(@.name=="IntegrationTestGroup1")].updatedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    And greengrass group "IntegrationTestGroup1" exists with attributes:
      | $.Id | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.Name | IntegrationTestGroup1 |
      | $.tags.cdf_template | IntegrationTestTemplate |
      | $.tags.cdf_template_version | 1 |
    And greengrass group "IntegrationTestGroup1" function definition exists with attributes:
      | $.Definition.Functions.length | 1 |
      | $.Definition.Functions[?(@.Id=="func_2")].FunctionArn | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Functions[?(@.Id=="func_2")].FunctionConfiguration.Environment.Variables.VAR_2 | ___regex___:^IntegrationTestGroup1-Core_IntegrationTestCore_arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing\/.*$ |
    And greengrass group "IntegrationTestGroup1" core definition exists with attributes:
      | $.Definition.Cores.length | 1 |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Cores[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" device definition exists with attributes:
      | $.Definition.Devices.length | 1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].ThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].CertificateArn | ___regex___:^arn:aws:iot:%property:aws.region%:%property:aws.accountId%:cert\/.*$ |
      | $.Definition.Devices[?(@.ThingArn=="arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1")].SyncShadow | true |
    And greengrass group "IntegrationTestGroup1" subscription definition exists with attributes:
      | $.Definition.Subscriptions.length | 7 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Source | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Subject | incoming/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_1")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Subject | outgoing/v2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_2")].Target | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_3")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_3")].Subject | outgoing/v3 |
      | $.Definition.Subscriptions[?(@.Id=="sub_3")].Target | arn:aws:lambda:%property:aws.region%:%property:aws.accountId%:function:deans-gg-hello-world:1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Subject | dt/IntegrationTestGroup1-Core/core/v2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_core")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Source | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Subject | dt/IntegrationTestGroup1-Core/v2 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_outgoing")].Target | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Subject | cmd/IntegrationTestGroup1-Core/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Core_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Core |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Source | cloud |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Subject | cmd/IntegrationTestGroup1-Device1/v1 |
      | $.Definition.Subscriptions[?(@.Id=="sub_IntegrationTestGroup1-Device1_incoming")].Target | arn:aws:iot:%property:aws.region%:%property:aws.accountId%:thing/IntegrationTestGroup1-Device1 |

  @teardown_greengrass_provisioning
  Scenario: Teardown
    Given thing "IntegrationTestCore" does not exist
    And thing "IntegrationTestDevice" does not exist
    And greengrass-provisioning group "IntegrationTestGroup1" does not exist
    And greengrass-provisioning group "IntegrationTestGroup2" does not exist
    And greengrass-provisioning group "IntegrationTestTemplateGroup" does not exist
    And greengrass-provisioning template "IntegrationTestTemplate" does not exist
    