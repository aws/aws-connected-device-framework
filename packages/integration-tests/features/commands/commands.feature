Feature: Commands

  @setup_commands_feature
  Scenario: Setup
    Given command template "testCommandsFeatureTemplateSimple" exists
    And command template "testCommandsFeatureTemplateParams" exists
    And command template "testCommandsFeatureTemplateFiles" exists

  Scenario: Create a new simple command, no status, defaults to draft, can be published
    Given command template "testCommandsFeatureTemplateSimple" exists
    When I create a command with attributes
      | templateId | testCommandsFeatureTemplateSimple |
      | targets | [ "%property:thing.arn%" ] |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateSimple |
      | targets | [ "%property:thing.arn%" ] |
      | commandStatus | DRAFT |
    When I update last command with attributes
      | commandStatus | PUBLISHED |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateSimple |
      | targets | [ "%property:thing.arn%" ] |
      | commandStatus | PUBLISHED |
    And job for last command exists

  Scenario: Create a command requiring params, but not supplied, disallows publishing
    Given command template "testCommandsFeatureTemplateParams" exists
    When I create a command with attributes
      | templateId | testCommandsFeatureTemplateParams |
      | targets | [ "%property:thing.arn%" ] |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateParams |
      | targets | [ "%property:thing.arn%" ] |
      | commandStatus | DRAFT |
    When I update last command with attributes
      | commandStatus | PUBLISHED |
    Then it fails with a 400

  Scenario: Create a command requiring params, are supplied, allows publishing
    Given command template "testCommandsFeatureTemplateParams" exists
    When I create a command with attributes
      | templateId | testCommandsFeatureTemplateParams |
      | targets | [ "%property:thing.arn%" ] |
      | documentParameters | {"paramA":"valueA","paramB":"valueB"} |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateParams |
      | targets | [ "%property:thing.arn%" ] |
      | documentParameters | {"paramA":"valueA","paramB":"valueB"} |
      | commandStatus | DRAFT |
    When I update last command with attributes
      | commandStatus | PUBLISHED |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateParams |
      | documentParameters | {"paramA":"valueA","paramB":"valueB"} |
      | targets | [ "%property:thing.arn%" ] |
      | jobStatus | IN_PROGRESS |
      | commandStatus | PUBLISHED |
    And job for last command exists

  Scenario: Create a command requiring files, but not supplied, disallows publishing
    Given command template "testCommandsFeatureTemplateFiles" exists
    When I create a command with attributes
      | templateId | testCommandsFeatureTemplateFiles |
      | targets | [ "%property:thing.arn%" ] |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateFiles |
      | targets | [ "%property:thing.arn%" ] |
      | commandStatus | DRAFT |
    When I update last command with attributes
      | commandStatus | PUBLISHED |
    Then it fails with a 400

  Scenario: Create a command requiring files, are supplied, allows publishing
    Given command template "testCommandsFeatureTemplateFiles" exists
    When I create a command with attributes
      | templateId | testCommandsFeatureTemplateFiles |
      | targets | [ "%property:thing.arn%" ] |
    And I upload file "fileA.txt" to last command as file alias "fileA"
    And I upload file "fileB.txt" to last command as file alias "fileB"
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateFiles |
      | targets | [ "%property:thing.arn%" ] |
      | commandStatus | DRAFT |
    And last command has a file uploaded as file alias "fileA"
    And last command has a file uploaded as file alias "fileB"
    When I update last command with attributes
      | commandStatus | PUBLISHED |
    Then last command exists with attributes
      | templateId | testCommandsFeatureTemplateFiles |
      | targets | [ "%property:thing.arn%" ] |
      | jobStatus | IN_PROGRESS |
      | commandStatus | PUBLISHED |
    And job for last command exists



  @teardown_commands_feature
  Scenario: Teardown
    Given command template "testCommandsFeatureTemplateSimple" does not exist
    And command template "testCommandsFeatureTemplateParams" does not exist
    And command template "testCommandsFeatureTemplateFiles" does not exist

