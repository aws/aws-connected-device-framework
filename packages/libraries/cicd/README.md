# CICD

## Sample CodeCommit trigger message

```sh
{
    "Records": [
        {
            "awsRegion": "us-west-2",
            "codecommit": {
                "references": [
                    {
                        "commit": "27d14518f85006b48772eb4d05a9a8264804faa3",
                        "ref": "refs/heads/master"
                    }
                ]
            },
            "eventId": "ed61b373-8582-472b-90f7-e425b72934ed",
            "eventName": "ReferenceChanges",
            "eventPartNumber": 1,
            "eventSource": "aws:codecommit",
            "eventSourceARN": "arn:aws:codecommit:us-west-2:157731826412:cdf-core",
            "eventTime": "2019-03-02T03:44:30.140+0000",
            "eventTotalParts": 1,
            "eventTriggerConfigId": "4b3c0c0d-a0aa-4b11-86e5-57d7c91339dc",
            "eventTriggerName": "cdf-core-repo-trigger",
            "eventVersion": "1.0",
            "userIdentityARN": "arn:aws:iam::157731826412:user/deanhart"
        }
    ]
}
```