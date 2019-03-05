Feature: Group search

  @setup_groupSearch_lite_feature
  Scenario: Setup
    Given group "AA" exists
    And group "AB" exists
    And group "BA" exists
    And group "BB" exists

  Scenario: Top level string attribute equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | eq | groupPath:AA |
    Then search result contains 1 results
    And search result contains group "AA"

  Scenario: Custom string attribute equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | eq | attributes.pair:black-black |
    Then search result contains 1 results
    And search result contains group "AA"

  Scenario: Top level string attribute not equals
    Given group "AA" exists
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | neq | groupPath:AA |
    Then search result contains 3 results
    And  search result contains group "AB"
    And search result contains group "BA"
    And search result contains group "BB"

  Scenario: Custom string attribute not equals
    And group "AA" exists
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | neq | attributes.pair:black-black |
    Then search result contains 3 results
    And  search result contains group "AB"
    And search result contains group "BA"
    And search result contains group "BB"

  Scenario: Top level string attribute starts with
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | startsWith | groupPath:A |
    Then search result contains 2 results
    And search result contains group "AA"
    And search result contains group "AB"

  Scenario: Custom string attribute starts with
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | startsWith | attributes.pair:black |
    Then search result contains 2 results
    And search result contains group "AA"
    And search result contains group "AB"

  Scenario: Custom number attribute less than
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | lt | attributes.position:3 |
    Then search result contains 2 results
    And search result contains group "AA"
    And search result contains group "AB"

  Scenario: Custom number attribute less than or equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | lte | attributes.position:3 |
    Then search result contains 3 results
    And search result contains group "AA"
    And search result contains group "AB"
    And search result contains group "BA"

  Scenario: Custom number attribute greater than
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | gt | attributes.position:3 |
    Then search result contains 1 results
    And search result contains group "BB"

  Scenario: Custom number attribute greater than or equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | groupSearch_feature |
      | gte | attributes.position:3 |
    Then search result contains 2 results
    And search result contains group "BA"
    And search result contains group "BB"

  @teardown_groupSearch_lite_feature
  Scenario: Teardown
    Given group "AA" does not exist
    And group "AB" does not exist
    And group "BA" does not exist
    And group "BB" does not exist
    And group "groupSearch_feature" does not exist



