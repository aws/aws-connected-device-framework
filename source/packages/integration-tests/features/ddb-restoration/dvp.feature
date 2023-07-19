Feature: Device Patcher - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfDvpStackDev-DvpDevicePatcherTable-Recovered" in stack "CdfDvpStackDev"
        Then patch template "integration_test_template" exists
