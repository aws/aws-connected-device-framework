Feature: Greengrass2 Provisioning - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfGgpStackDev-GgpGreengrassProvisioningTable-Recovered" in stack "CdfGgpStackDev"
        Then no operation is needed
