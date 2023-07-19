Feature: Bulk Certs - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfBctStackDev-BctBulkCertsTable-Recovered" in stack "CdfBctStackDev"
        Then no operation is needed
