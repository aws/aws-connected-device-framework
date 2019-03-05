Feature: Group lifecycle

  @setup_groups_feature
  Scenario: Setup
    Given group "/TEST-groups-group001" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist


  Scenario: Create a new group Template
    Given draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    When I create the assetlibrary group template "TEST-groups-groupTemplate001" with attributes
      | properties | {"color":{"type":["string","null"]},"size":{"type":"string"}} |
      | required | ["size"] |
    And publish assetlibrary group template "TEST-groups-groupTemplate001"
    Then published assetlibrary group template "TEST-groups-groupTemplate001" exists with attributes
      | properties |{"color":{"type":["string","null"]},"size":{"type":"string"}} |
      | required | ["size"] |

  
  Scenario: Create another new group Template
    Given draft assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    When I create the assetlibrary group template "TEST-groups-groupTemplate002" with attributes
      | relations | {"out": {"belongs_to": ["TEST-groups-groupTemplate001"]}} |
    And publish assetlibrary group template "TEST-groups-groupTemplate002"
    Then published assetlibrary group template "TEST-groups-groupTemplate002" exists with attributes
      | relations | {"out": {"belongs_to": ["TEST-groups-groupTemplate001"]}} |


  Scenario: Create a group with valid attributes
    Given published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" does not exist
    When I create group "TEST-groups-group001" of "/" with attributes
      | templateId | test-groups-grouptemplate001 |
      | description | My group |
      | attributes | {"color":"black","size":"S"} |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId | test-groups-grouptemplate001 |
      | name | TEST-groups-group001 |
      | description | My group |
      | parentPath | / |
      | attributes |  {"color":"black","size":"S"} |

  Scenario: Linking a group during creation using a defined relation is successful
    Given group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" does not exist
    When I create group "TEST-groups-group002" of "/" with attributes
      | templateId | test-groups-grouptemplate002 |
      | description | My second group |
      | attributes | {} |
      | groups | {"belongs_to":["/test-groups-group001"]} |
    Then group "/TEST-groups-group002" exists with attributes
      | templateId | test-groups-grouptemplate002 |
      | name | TEST-groups-group002 |
      | description | My second group |
      | attributes | {} |
      | parentPath | / |
      | groups | {"belongs_to":["/test-groups-group001"]} |

  Scenario: Linking a group during creation using a defined relation but unsupported type is unsuccessful
    Given group "/TEST-groups-group002" exists
    When I create group "TEST-groups-group004" of "/" with attributes
      | templateId | test-groups-grouptemplate002 |
      | description | My second group |
      | attributes | {} |
      | groups | {"belongs_to":["/test-groups-group002"]} |
    Then it fails with a 400
     And group "/TEST-groups-group004" does not exist

  Scenario: Linking a group during creation using an undefined relation is unsuccessful
    Given group "/TEST-groups-group002" exists
    When I create group "TEST-groups-group004" of "/" with attributes
      | templateId | test-groups-grouptemplate002 |
      | description | My second group |
      | attributes | {} |
      | groups | {"linked_to":["/test-groups-group001"]} |
    Then it fails with a 400
     And group "/TEST-groups-group004" does not exist

  Scenario: Unlinking a group is successful
    Given group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I detatch group "/TEST-groups-group002" from group "/TEST-groups-group001" via "belongs_to"
    Then group "/TEST-groups-group002" exists with attributes
      | templateId | test-groups-grouptemplate002 |
      | name | TEST-groups-group002 |
      | description | My second group |
      | attributes | {} |
      | parentPath | / |
      | groups | ___undefined___ |

  Scenario: Relinking a group is successful
    Given group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I attach group "/TEST-groups-group002" to group "/TEST-groups-group001" via "belongs_to"
    Then group "/TEST-groups-group002" exists with attributes
      | templateId | test-groups-grouptemplate002 |
      | name | TEST-groups-group002 |
      | description | My second group |
      | attributes | {} |
      | parentPath | / |
      | groups | {"belongs_to":["/test-groups-group001"]} |

  Scenario: Linking a group with defined relation but unsupported type is unsuccessful
    Given group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I attach group "/TEST-groups-group002" to group "/TEST-groups-group001" via "linked_to"
    Then it fails with a 400


  Scenario: Create a group with missing required attributes fails
    Given published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group003" does not exist
    When I create group "TEST-groups-group003" of "/" with invalid attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":"black"} |
    Then it fails with a 400
    And group "/TEST-groups-group003" does not exist


  Scenario: Update existing groups attributes
    Given group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"size":"M"} |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId | test-groups-grouptemplate001 |
      | name | TEST-groups-group001 |
      | description | My group |
      | parentPath | / |
      | attributes | {"color":"black","size":"M"} |


  Scenario: Clear existing custom group attributes
    Given group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":null} |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId | test-groups-grouptemplate001 |
      | name | TEST-groups-group001 |
      | description | My group |
      | parentPath | / |
      | attributes |  {"size":"M"} |


  Scenario: Clear existing top level group attribute
    Given group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | description | ___null___ |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId | test-groups-grouptemplate001 |
      | name | TEST-groups-group001 |
      | description | ___undefined___ |
      | parentPath | / |
      | attributes |  {"size":"M"} |


  Scenario: Group paths are unique
    Given group "/TEST-groups-group001" exists
    When I create group "TEST-groups-group001" of "/" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":"black","size":"S"} |
    Then it fails with a 409


  Scenario: Retrieving a group that does not exist
    Given group "/TEST-groups-groupXXX" does not exist
    When I get group "/TEST-groups-groupXXX"
    Then it fails with a 404


  Scenario: Should not be able to clear existing groups required attributes
    Given group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"size":null} |
    Then it fails with a 400


  Scenario: Should not be able to delete a template when groups still exist
    Given published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" exists
    When I delete assetlibrary group template "TEST-groups-groupTemplate001"
    Then it fails with a 409
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists


  Scenario: Delete the group
    Given group "/TEST-groups-group001" exists
    When I delete group "/TEST-groups-group001"
    Then group "/TEST-groups-group001" does not exist


  Scenario: Should be able to delete a template when no groups exist
    Given published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" does not exist
    When I delete assetlibrary group template "TEST-groups-groupTemplate001"
    Then published assetlibrary group template "TEST-groups-groupTemplate001" does not exist
  

  @teardown_groups_feature
  Scenario: Teardown
    Given group "/TEST-groups-group001" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist

