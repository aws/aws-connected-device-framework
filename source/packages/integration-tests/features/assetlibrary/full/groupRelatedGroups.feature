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
  
  Scenario: Create a new group Template
    Given draft assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    When I create the assetlibrary group template "TEST-groups-groupTemplate002" with attributes
      | properties | {"gSysUserId":{"type":["string","null"]},"ownerHistoryNum":{"type":"string"}} |
      | required | ["gSysUserId"] |
      | relations | {"out": {"owner": ["TEST-groups-groupTemplate001"]}} |
    And publish assetlibrary group template "TEST-groups-groupTemplate002"
    Then published assetlibrary group template "TEST-groups-groupTemplate002" exists with attributes
      | properties | {"gSysUserId":{"type":["string","null"]},"ownerHistoryNum":{"type":"string"}} |
      | required | ["gSysUserId"] |
      | relations | {"out": {"owner": ["TEST-groups-groupTemplate001"]}} |

  Scenario: Create a group with valid attributes
    Given published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" does not exist
    When I create group "TEST-groups-group001" of "/" with attributes
      | templateId | test-groups-grouptemplate001 |
      | description | My group car |
      | attributes | {"color":"black","size":"S"} |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId | test-groups-grouptemplate001 |
      | name | TEST-groups-group001 |
      | description | My group car|
      | parentPath | / |
      | attributes | {"color":"black","size":"S"} |

  Scenario: Create a group with valid attributes
    Given published assetlibrary group template "TEST-groups-groupTemplate002" exists
    And group "/TEST-groups-group002" does not exist
    When I create group "TEST-groups-group002" of "/" with attributes
      | templateId | test-groups-grouptemplate002 |
      | description | My group user|
      | attributes | {"gSysUserId":"guym02","ownerHistoryNum":"0"} |
      | groups | {"owner":["/test-groups-group001"]} |
    Then group "/TEST-groups-group002" exists with attributes
      | templateId | test-groups-grouptemplate002 |
      | name | TEST-groups-group002 |
      | description | My group user|
      | parentPath | / |
      | attributes | {"gSysUserId":"guym02","ownerHistoryNum":"0"} |
      | groups | {"owner":["/test-groups-group001"]} |

  Scenario: Create a group with valid attributes
    Given published assetlibrary group template "TEST-groups-groupTemplate002" exists
    And group "/TEST-groups-group003" does not exist
    When I create group "TEST-groups-group003" of "/" with attributes
      | templateId | test-groups-grouptemplate002 |
      | description | My group user|
      | attributes | {"gSysUserId":"guym03","ownerHistoryNum":"0"} |
      | groups | {"owner":["/test-groups-group001"]} |
    Then group "/TEST-groups-group003" exists with attributes
      | templateId | test-groups-grouptemplate002 |
      | name | TEST-groups-group003 |
      | description | My group user|
      | parentPath | / |
      | attributes | {"gSysUserId":"guym03","ownerHistoryNum":"0"} |
      | groups | {"owner":["/test-groups-group001"]} |

  #1
  Scenario: Can retrieve related group with all parameter
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    | offset | 0  |
    | count | 5  |
    | sort | ASC  |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"
    
  #2
  Scenario: Cann't retrieve related group with error relationship parameter
    When I retrieve groups related of "/TEST-groups-group001" with "driver" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    | offset | 0  |
    | count | 5  |
    | sort | ASC  |
    Then group contains 0 groups

  #3
  Scenario: Cann't retrieve related group with error templateId parameter
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate003 |
    | direction | in |
    | offset | 0  |
    | count | 5  |
    | sort | ASC  |
    Then group contains 0 groups
    
  #4
  Scenario: Cann't retrieve related group with error direction parameter
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | out |
    | offset | 0  |
    | count | 5  |
    | sort | ASC  |
    Then group contains 0 groups
    
  #5
  Scenario: Cann't retrieve related group with error offset/count parameter
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    | offset | 2  |
    | count | 5  |
    | sort | ASC  |
    Then group contains 0 groups 

  #6
  Scenario: Can retrieve related group with error sort parameter because it has default setting
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    | offset | 0  |
    | count | 5  |
    | sort | xxx  |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"
    
  #7
  Scenario: Can Retrieve Related group without parameter
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    |  |   |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"

  #8
  Scenario: Can Retrieve Related group with only templateId
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"

  #9
  Scenario: Can Retrieve Related group with templateId and direction
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"
  
  #10
  Scenario: Can Retrieve Related group with templateId,direction,offset and count
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | direction | in |
    | offset | 0  |
    | count | 5  |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"

  #11
  Scenario: Can Retrieve first page of Related group with offset and count
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | offset | 0 |
    | count | 1  |
     Then group contains 1 groups
    ## Because the order of list that retrieved is arbitrary, not to check this case temporarily.
    #And group contains group "/test-groups-group002"

  #12
  Scenario: Can Retrieve second page of Related group with offset and count
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | test-groups-grouptemplate002 |
    | offset | 1 |
    | count | 1  |
     Then group contains 1 groups
    ## Because the order of list that retrieved is arbitrary, not to check this case temporarily.
    #And group contains group "/test-groups-group003"
    
  #13
  Scenario: Can retrieve related group with all blank parameter 
    When I retrieve groups related of "/TEST-groups-group001" with "owner" relationship and following parameters:
    | templateId | |
    | direction | |
    | offset | |
    | count |  |
    | sort | |
    Then group contains 2 groups
    And group contains group "/test-groups-group002"
    And group contains group "/test-groups-group003"
    
  @teardown_groups_feature
  Scenario: Teardown
    Given group "/TEST-groups-group001" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist
