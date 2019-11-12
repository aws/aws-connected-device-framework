Feature: Group search

  @setup_groupSearch_feature
  Scenario: Setup
    Given published assetlibrary group template "TEST-groupSearch-group" exists
    And group "/groupSearch_feature/AA" exists
    And group "/groupSearch_feature/AB" exists
    And group "/groupSearch_feature/BA" exists
    And group "/groupSearch_feature/BB" exists

  Scenario: Top level string attribute equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | eq | name:AA |
    Then search result contains 1 results
    And search result contains group "/groupsearch_feature/aa"

  Scenario: Custom string attribute equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | eq | pair:black-black |
    Then search result contains 1 results
    And search result contains group "/groupsearch_feature/aa"

  Scenario: Top level string attribute not equals
    And group "/groupSearch_feature/AA" exists
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | neq | name:AA |
    Then search result contains 3 results
    And  search result contains group "/groupsearch_feature/ab"
    And search result contains group "/groupsearch_feature/ba"
    And search result contains group "/groupsearch_feature/bb"

  Scenario: Custom string attribute not equals
    And group "/groupSearch_feature/AA" exists
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | neq | pair:black-black |
    Then search result contains 3 results
    And  search result contains group "/groupsearch_feature/ab"
    And search result contains group "/groupsearch_feature/ba"
    And search result contains group "/groupsearch_feature/bb"

  Scenario: Top level string attribute starts with
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | startsWith | name:A |
    Then search result contains 2 results
    And search result contains group "/groupsearch_feature/aa"
    And search result contains group "/groupsearch_feature/ab"

  Scenario: Custom string attribute starts with
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | startsWith | pair:black |
    Then search result contains 2 results
    And search result contains group "/groupsearch_feature/aa"
    And search result contains group "/groupsearch_feature/ab"

  Scenario: Custom number attribute less than
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | lt | position:3 |
    Then search result contains 2 results
    And search result contains group "/groupsearch_feature/aa"
    And search result contains group "/groupsearch_feature/ab"

  Scenario: Custom number attribute less than or equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | lte | position:3 |
    Then search result contains 3 results
    And search result contains group "/groupsearch_feature/aa"
    And search result contains group "/groupsearch_feature/ab"
    And search result contains group "/groupsearch_feature/ba"

  Scenario: Custom number attribute greater than
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | gt | position:3 |
    Then search result contains 1 results
    And search result contains group "/groupsearch_feature/bb"

  Scenario: Custom number attribute greater than or equals
    When I search with following attributes:
      | type | group |
      | ancestorPath | /groupSearch_feature |
      | gte | position:3 |
    Then search result contains 2 results
    And search result contains group "/groupsearch_feature/ba"
    And search result contains group "/groupsearch_feature/bb"

  @teardown_groupSearch_feature
  Scenario: Teardown
    Given group "/groupSearch_feature/AA" does not exist
    And group "/groupSearch_feature/AB" does not exist
    And group "/groupSearch_feature/BA" does not exist
    And group "/groupSearch_feature/BB" does not exist
    And group "/groupSearch_feature" does not exist
    And draft assetlibrary group template "TEST-groupSearch-group" does not exist
    And published assetlibrary group template "TEST-groupSearch-group" does not exist



