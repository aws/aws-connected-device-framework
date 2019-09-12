Feature: Command Templates

  @setup_templates_feature
  Scenario: Setup
    Given command template "testCommandTemplate" does not exist


  Scenario: Create a new Command Template
    Given command template "testCommandTemplate" does not exist
    When I create the command template "testCommandTemplate" with attributes
      | description | Test template |
      | document | Test document |
      | operation | test |
      | requiredDocumentParameters | ["paramA","paramB"] |
      | requiredFiles | ["fileA","fileB"] |
      | presignedUrlExpiresInSeconds | 123 |
    Then command template "testCommandTemplate" exists with attributes
      | description | Test template |
      | document | Test document |
      | operation | test |
      | requiredDocumentParameters | ["paramA","paramB"] |
      | requiredFiles | ["fileA","fileB"] |
      | presignedUrlExpiresInSeconds | 123 |


  Scenario: Create a new Command Template with missing required field document fails
    Given command template "testCommandTemplateInvalid" does not exist
    When I create the command template "testCommandTemplateInvalid" with attributes
      | description | Test template |
      | operation | test |
      | requiredDocumentParameters | ["paramA","paramB"] |
      | requiredFiles | ["fileA","fileB"] |
      | presignedUrlExpiresInSeconds | 123 |
    Then it fails with a 400
    And command template "testCommandTemplateInvalid" does not exist


  Scenario: Create a new Command Template with missing required field operation fails
    Given command template "testCommandTemplateInvalid" does not exist
    When I create the command template "testCommandTemplateInvalid" with attributes
      | description | Test template |
      | document | Test document |
      | requiredDocumentParameters | ["paramA","paramB"] |
      | requiredFiles | ["fileA","fileB"] |
      | presignedUrlExpiresInSeconds | 123 |
    Then it fails with a 400
    And command template "testCommandTemplateInvalid" does not exist


  Scenario: Create a new Command Template with missing optional fields
    Given command template "testCommandTemplate2" does not exist
    When I create the command template "testCommandTemplate2" with attributes
      | description | Test template |
      | operation | test |
      | document | Test document |
    Then command template "testCommandTemplate2" exists with attributes
      | description | Test template |
      | operation | test |
      | document | Test document |


  Scenario: Update an existing template
    Given command template "testCommandTemplate" exists
    When I update command template "testCommandTemplate" with attributes
      | description | updated description |
      | operation | test |
      | document | updated document |
      | requiredDocumentParameters | ["paramC"] |
      | requiredFiles | ["fileC"] |
      | presignedUrlExpiresInSeconds | 456 |
    Then command template "testCommandTemplate" exists with attributes
      | description | updated description |
      | operation | test |
      | document | updated document |
      | requiredDocumentParameters | ["paramC"] |
      | requiredFiles | ["fileC"] |
      | presignedUrlExpiresInSeconds | 456 |


  Scenario: Retrieving a template that does not exist
    Given command template "testCommandTemplateXXX" does not exist
    When I get command template "testCommandTemplateXXX"
    Then it fails with a 404


  Scenario: Should not be able to clear existing command required attributes
    Given command template "testCommandTemplate" exists
    When I update command template "testCommandTemplate" with attributes
      | document | ___null___ |
    Then it fails with a 400


  Scenario: Delete the template
    Given command template "testCommandTemplate2" exists
    When I delete command template "testCommandTemplate2"
    Then command template "testCommandTemplate2" does not exist


  Scenario: Template Ids are unique
    Given command template "testCommandTemplate" exists
    When I create the command template "testCommandTemplate" with attributes
      | document | Test document |
      | operation | test |
    Then it fails with a 409



  @teardown_templates_feature
  Scenario: Teardown
   Given command template "testCommandTemplate" does not exist
