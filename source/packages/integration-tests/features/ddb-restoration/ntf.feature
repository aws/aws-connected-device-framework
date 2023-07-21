Feature: Notifications - DynamoDB Restoration

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfNtfStackDev-NtfEventsProcessorEventConfigTable-Recovered" in stack "CdfNtfStackDev"
        Then no operation is needed

    Scenario: DynamoDB Restoration
        Given I restored DynamoDB data table "CdfNtfStackDev-NtfEventsProcessorEventNotificationsTable-Recovered" in stack "CdfNtfStackDev"
        Then no operation is needed
