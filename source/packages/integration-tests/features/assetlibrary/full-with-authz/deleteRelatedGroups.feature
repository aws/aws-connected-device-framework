# These tests setup a graph structure that is tricky to get right with authorization.
# The reason the structure is tricky is it contains circular auth paths, and the deletion
# step also depends on an auth path that is part of the graph traversal to adjacent vertices.
Feature: Delete related groups

    @setup_deleteRelatedGroups_feature
    Scenario: Setup root group template
        Everything will connect to this template for teardown. A single group inherits from it
        Given my authorization is
            | / | * |
        Then assetlibrary group template "TEST-drg-groupTemplate001" exists

    Scenario: Setup base auth group
        The device connects to this group to give a low chance of auth failure on teardown
        Given my authorization is
            | / | * |
        And group "TEST-drg-group001" does not exist
        When I create group "TEST-drg-group001" of "/" with attributes
            | templateId | TEST-drg-groupTemplate001 |
        Then group "/TEST-drg-group001" exists

    Scenario: Setup inward connected group
        Given my authorization is
            | / | * |
        And group "TEST-drg-group-inward" does not exist
        When I create group "TEST-drg-group-inward" of "/" with attributes
            | templateId | TEST-drg-groupTemplate001 |
        Then group "/TEST-drg-group-inward" exists

    Scenario: Setup outward connected group
        Given my authorization is
            | / | * |
        And group "TEST-drg-group-outward" does not exist
        When I create group "TEST-drg-group-outward" of "/" with attributes
            | templateId | TEST-drg-groupTemplate001 |
        Then group "/TEST-drg-group-outward" exists

    Scenario: Setup group for auth loop
        Given my authorization is
            | / | * |
        And group "TEST-drg-group-loop" does not exist
        When I create group "TEST-drg-group-loop" of "/" with attributes
            | templateId | TEST-drg-groupTemplate002                                                   |
            | groups     | {"in": {"authPath": ["/TEST-drg-group-outward", "/TEST-drg-group-inward"]}} |
        Then group "/TEST-drg-group-loop" exists

    Scenario: Setup group for permissions
        Given my authorization is
            | / | * |
        And group "TEST-drg-group-authorized" does not exist
        When I create group "TEST-drg-group-authorized" of "/" with attributes
            | templateId | TEST-drg-groupTemplate001 |
        Then group "/TEST-drg-group-authorized" exists

    Scenario: Setup outward connected group without permissions
        Given my authorization is
            | / | * |
        And group "TEST-drg-group-unauth" does not exist
        When I create group "TEST-drg-group-unauth" of "/" with attributes
            | templateId | TEST-drg-groupTemplate001 |
        Then group "/TEST-drg-group-unauth" exists

    Scenario: Setup device template
        The device will use this Template
        Given my authorization is
            | / | * |
        And draft assetlibrary device template "TEST-drg-deviceTemplate001" does not exist
        And published assetlibrary device template "TEST-drg-deviceTemplate001" does not exist
        When I create the assetlibrary device template "TEST-drg-deviceTemplate001" with attributes
            | properties | {}                                                                                                                                                                                                                                                                                                                    |
            | relations  | {"out":{"failsafe":[{"name": "TEST-drg-groupTemplate001", "includeInAuth": true}], "link1":[{"name": "test-drg-groupTemplate001", "includeInAuth": true}]}, "in":{"link1":[{"name": "TEST-drg-groupTemplate001", "includeInAuth": true}], "authPath":[{"name": "test-drg-groupTemplate002", "includeInAuth": true}]}} |
        And publish assetlibrary device template "TEST-drg-deviceTemplate001"
        Then published assetlibrary device template "TEST-drg-deviceTemplate001" exists

    Scenario: Setup device
        Given my authorization is
            | / | * |
        And device "TEST-drg-device" does not exist
        When I create device "TEST-drg-device" with attributes
            | templateId | TEST-drg-deviceTemplate001                                                                                                                                                                                                  |
            | groups     | {"out":{"failsafe":["/TEST-drg-group001"], "link1": ["/TEST-drg-group-outward", "/TEST-drg-group-authorized", "/TEST-drg-group-unauth"]}, "in":{"link1": ["/TEST-drg-group-inward"], "authPath": ["/TEST-drg-group-loop"]}} |
        Then device "TEST-drg-device" exists with attributes
            | $.groups.out.link1   | ___deepEqualInAnyOrder___ ["/test-drg-group-outward", "/test-drg-group-authorized", "/test-drg-group-unauth"] |
            | $.groups.in.link1    | ___deepEqualInAnyOrder___ ["/test-drg-group-inward"]                                                          |
            | $.groups.in.authpath | ___deepEqualInAnyOrder___ ["/test-drg-group-loop"]                                                            |

    Scenario: Delete authorized groups related to device via link1
        This test validates only authorized groups are deleted
        Given my authorization is
            | / | * |
        And device "TEST-drg-device" exists with attributes
            | $.groups.out.link1   | ___deepEqualInAnyOrder___ ["/test-drg-group-outward", "/test-drg-group-authorized", "/test-drg-group-unauth"] |
            | $.groups.in.link1    | ___deepEqualInAnyOrder___ ["/test-drg-group-inward"]                                                          |
            | $.groups.in.authpath | ___deepEqualInAnyOrder___ ["/test-drg-group-loop"]                                                            |
        And my authorization is
            | /test-drg-group-authorized | * |
        When I remove device "TEST-drg-device" from groups related via "link1"
        And my authorization is
            | / | * |
        Then device "TEST-drg-device" exists with attributes
            | $.groups.out.link1   | ___deepEqualInAnyOrder___ ["/test-drg-group-unauth"] |
            | $.groups.in.link1    | ___undefined___                                      |
            | $.groups.in.authpath | ___deepEqualInAnyOrder___ ["/test-drg-group-loop"]   |

    Scenario: TEARDOWN: remove all devices, groups, and templates, that were created as part of this
        Ensures all the test resources have been removed
        Given my authorization is
            | / | * |
        When I delete group "/TEST-drg-group-unauth"
        And I delete group "/TEST-drg-group-authorized"
        And I delete group "/TEST-drg-group-loop"
        And I delete group "/TEST-drg-group-outward"
        And I delete group "/TEST-drg-group-inward"
        And I delete device "TEST-drg-device"
        And I delete group "/TEST-drg-group001"
        And I delete assetlibrary device template "TEST-drg-deviceTemplate001"
        And I delete assetlibrary group template "TEST-drg-groupTemplate002"
        And I delete assetlibrary group template "TEST-drg-groupTemplate001"
        Then group "/TEST-drg-group-unauth" does not exist
        And group "/TEST-drg-group-authorized" does not exist
        And group "/TEST-drg-group-outward" does not exist
        And group "/TEST-drg-group-inward" does not exist
        And group "/TEST-drg-group-loop" does not exist
        And device "TEST-drg-device" does not exist
        And group "/TEST-drg-group001" does not exist
        And assetlibrary device template "TEST-drg-deviceTemplate001" does not exist
        And assetlibrary group template "TEST-drg-groupTemplate002" does not exist
        And assetlibrary group template "TEST-drg-groupTemplate001" does not exist