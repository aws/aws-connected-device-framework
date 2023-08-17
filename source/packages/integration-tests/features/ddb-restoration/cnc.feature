Feature: Command & Control - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfCncStackDev-CncDataTable-Recovered" in stack "CdfCncStackDev"
        Then no operation is needed
