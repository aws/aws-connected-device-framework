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

Feature: Device enhanced search

  @setup_deviceSearch_enhanced_feature
  Scenario: Setup
    Given published assetlibrary device template "test-enhancedsearch-deviceTpl" exists
    And group "/enhancedSearchGroup_all" exists
    And group "/enhancedSearchGroup_xxyy" exists
    And group "/enhancedSearchGroup_xyyx" exists
    And device "test-enhancedsearch-aaaa" exists
    And device "test-enhancedsearch-aaab" exists

  Scenario: Baseline search for all devices
    When I search with summary with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
    Then search result contains 16 total

  Scenario: Startswith search using enhanced search 1
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | startsWith | characters:a |
    Then search result contains 8 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaab"
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-aabb"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-abab"
    And search result contains device "test-enhancedsearch-abba"
    And search result contains device "test-enhancedsearch-abbb"

  Scenario: Startswith search using enhanced search 2
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | startsWith | characters:aa |
    Then search result contains 4 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaab"
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-aabb"

  Scenario: Startswith search using enhanced search 3
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | startsWith | characters:aaa |
    Then search result contains 2 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaab"

  Scenario: Endswith search using enhanced search 1
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | endsWith | characters:a |
    Then search result contains 8 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-abba"
    And search result contains device "test-enhancedsearch-baaa"
    And search result contains device "test-enhancedsearch-baba"
    And search result contains device "test-enhancedsearch-bbaa"
    And search result contains device "test-enhancedsearch-bbba"

  Scenario: Endswith search using enhanced search 2
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | endsWith | characters:aa |
    Then search result contains 4 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-baaa"
    And search result contains device "test-enhancedsearch-bbaa"

  Scenario: Endswith search using enhanced search 3
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | endsWith | characters:aaa |
    Then search result contains 2 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-baaa"

  Scenario: Contains search using enhanced search 1
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | contains | characters:aaa |
    Then search result contains 3 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-baaa"
    And search result contains device "test-enhancedsearch-aaab"

  Scenario: Contains search using enhanced search 2
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | contains | characters:aba |
    Then search result contains 4 total
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-baba"
    And search result contains device "test-enhancedsearch-abab"

  Scenario: Regex search 1
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | regex | characters:a[ab]aa |
    Then search result contains 2 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-abaa"

  Scenario: Regex search 2
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | regex | characters:a.*a |
    Then search result contains 4 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-abba"

  Scenario: Fulltext search Apple
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | fulltext | words:apple |
    Then search result contains 5 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-abab"
    And search result contains device "test-enhancedsearch-baba"
    And search result contains device "test-enhancedsearch-bbba"

  Scenario: Fulltext search wildcard match for Apple and Pineapple
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | fulltext | words:*apple |
    Then search result contains 9 total
    And search result contains device "test-enhancedsearch-aaaa"
    And search result contains device "test-enhancedsearch-aaba"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-abab"
    And search result contains device "test-enhancedsearch-baaa"
    And search result contains device "test-enhancedsearch-baba"
    And search result contains device "test-enhancedsearch-babb"
    And search result contains device "test-enhancedsearch-bbaa"
    And search result contains device "test-enhancedsearch-bbba"

  Scenario: Fulltext fuzzy search Cherry misspelling
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | fulltext | words:chery~ |
    Then search result contains 4 total
    And search result contains device "test-enhancedsearch-aaab"
    And search result contains device "test-enhancedsearch-abaa"
    And search result contains device "test-enhancedsearch-baba"
    And search result contains device "test-enhancedsearch-bbbb"

  Scenario: Fulltext two words without operator
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | fulltext | words:kiwi banana |
    Then search result contains 10 total

  Scenario: Fulltext two words with AND operator
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | fulltext | words:kiwi AND banana |
    Then search result contains 1 total
    And search result contains device "test-enhancedsearch-bbab"

  Scenario: Lucene query with simple equality
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      # important: must URL-encode the filter value, otherwise the step definition will incorrectly parse it because of
      # the ":" characters in the lucene query
      | lucene | *:predicates.characters.value%3Abbba |
    Then search result contains 1 total
    And search result contains device "test-enhancedsearch-bbba"

  Scenario: Lucene query with boolean OR
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.characters.value%3Abbba%20OR%20predicates.characters.value%3Abbbb |
    Then search result contains 2 total
    And search result contains device "test-enhancedsearch-bbba"
    And search result contains device "test-enhancedsearch-bbbb"

  Scenario: Lucene query with boolean AND
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.characters.value%3Abbba%20AND%20predicates.characters.value%3Abbbb |
    Then search result contains 0 total

  Scenario: Lucene query with fulltext exact match
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.words.value%3Agrapefruit |
    Then search result contains 3 total

  Scenario: Lucene query with fulltext fuzzy match
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.words.value%3Agripefruit~ |
    Then search result contains 3 total

  Scenario: Lucene query with fulltext regex match
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.words.value%3A/g.+fruit/ |
    Then search result contains 3 total

  Scenario: Lucene query with regex fuzzy and boolean operators
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | lucene | *:predicates.characters.value%3Ababa%20AND%20predicates.words.value%3Agrapefruit |
    Then search result contains 1 total
    And search result contains device "test-enhancedsearch-baba"

  Scenario: Regex search with traversal
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | regex | part_of_group:out:name:enhancedSearchGroup_xy.* |
    Then search result contains 8 total

  Scenario: Regex search with traversal and non-traversal startsWith
    When I search with following attributes:
      | ancestorPath | /enhancedSearchGroup_all |
      | regex | part_of_group:out:name:enhancedSearchGroup_x[xy]{2}x |
      | startsWith | characters:a |
    Then search result contains 0 total

  @teardown_deviceSearch_enhanced_feature
  Scenario: Teardown
    Given draft assetlibrary device template "test-enhancedsearch-deviceTpl" does not exist
    And published assetlibrary device template "test-enhancedsearch-deviceTpl" does not exist
    And group "/enhancedSearchGroup_all" does not exist
    And group "/enhancedSearchGroup_xxyy" does not exist
    And group "/enhancedSearchGroup_xyyx" does not exist
    And device "test-enhancedsearch-aaaa" does not exist
    And device "test-enhancedsearch-aaab" does not exist
