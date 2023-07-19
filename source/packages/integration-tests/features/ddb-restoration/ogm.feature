Feature: Organization Manager - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfOgmStackDev-OgmOrganizationManagerTable-Recovered" in stack "CdfOgmStackDev"
        Then no operation is needed
