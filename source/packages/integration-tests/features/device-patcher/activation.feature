Feature: Device Activation

  Scenario: Create a device activation for an edge device
    Given an activation "abc-123" does not exist
    When I create an activation for "edge_device_01" edge device
    Then an activation is created with attributes
      | $.activationId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.activationCode | ___regex___:^[ A-Za-z0-9_@.\/#&+-]{20}$ |
      | $.activationRegion | ___regex___:^[A-Za-z0-9_\-]{9,}$ |
    And an activation exists for "edge_device_01" with attributes
      | $.activationId   | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$       |
      | $.deviceId       | edge_device_01                                                           |
      | $.createdAt      | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt      | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    When I delete the activation for "edge_device_01" edge device
    Then the activation does not exists for "edge_device_01"


