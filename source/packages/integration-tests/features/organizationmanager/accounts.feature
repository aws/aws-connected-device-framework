#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

Feature: Organization Manager Organizational Unit and Accounts Creation

    @setup_organizationmanager_feature
    Scenario: Setup
        Given organizational unit "ou-12345" does not exists
        And account "22222" does not exists
        And account "33333" does not exists


    Scenario: Creating An Organizational Unit
        Given organizational unit "ou-12345" does not exists
        When I create organizationalUnit with attributes
            | id   | ou-12345               |
            | name | test-ou                |
            | tags | { "createdBy" : "cdf"} |
        Then last organizationalUnit exists with attributes
            | id   | ou-12345 |
            | name | test-ou  |

    Scenario: Creating An Account under existing Organizational Unit
        Given account "22222" does not exists
        When I create account with attributes
            | accountId            | 22222         |
            | name                 | test-account  |
            | organizationalUnitId | ou-12345      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | regions              | ["us-west-2"] |
        Then last account exists with attributes
            | accountId            | 22222         |
            | name                 | test-account  |
            | organizationalUnitId | ou-12345      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | status               | ACTIVE        |
            | $.regions.length     | 1             |
            | $.regions[0]         | us-west-2     |

    Scenario: Creating An Account under existing Organizational Unit with null value for regions
        Given account "44444" does not exists
        When I create account with attributes
            | accountId            | 44444         |
            | name                 | test-account  |
            | organizationalUnitId | ou-12345      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | regions              | null          |
        Then last account creation fails with a 400

    Scenario: Creating An Account under existing Organizational Unit with empty regions
        Given account "55555" does not exists
        When I create account with attributes
            | accountId            | 55555         |
            | name                 | test-account  |
            | organizationalUnitId | ou-12345      |
            | email                | test@test.com |
            | ssoEmail             | test@test.com |
            | ssoFirstName         | John          |
            | ssoLastName          | Doe           |
            | regions              | []          |
        Then last account creation fails with a 400

    Scenario: Deleting an Organizational Unit that has accounts
        Given organizational unit "ou-12345" exists
        And account "22222" associated with organizational unit "ou-12345"
        When I delete organizationalUnit "ou-12345"
        Then last organizational unit deletion fails with a 400

    Scenario: Creating An Account under invalid Organizational Unit
        Given account "33333" does not exists
        When I create account with attributes
            | accountId            | 33333           |
            | name                 | invalid-account |
            | organizationalUnitId | ou-88888        |
            | email                | test@test.com   |
            | ssoEmail             | test@test.com   |
            | ssoFirstName         | John            |
            | ssoLastName          | Doe             |
            | regions              | ["us-west-2"]   |
        Then last account creation fails with a 400


    @teardown_organizationmanager_feature
    Scenario: Teardown
        Given organizational unit "ou-12345" does not exists
        And account "22222" does not exists
        And account "33333" does not exists
