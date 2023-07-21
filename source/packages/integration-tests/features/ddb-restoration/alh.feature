Feature: Asset Library History - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfAlhStackDev-AlhHistoryTable-Recovered" in stack "CdfAlhStackDev"
        Then no operation is needed

