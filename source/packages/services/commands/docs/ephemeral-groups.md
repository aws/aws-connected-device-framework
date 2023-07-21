# COMMANDS TARGETS

## Introduction

Devices within the CDF platform are identified by a `deviceId` and grouped in hierarchies. This structure is managed by the _CDF Asset Library_ module.

When creating commands to be executed by a device, a list of targets is required. These targets may comprise of CDF devices, CDF groups, AWS IoT thing ARN's, and/or AWS IoT group ARN's.

## AWS IoT Service Limitations

AWS IoT has the following service limitations which are of importance here:

| Service | Action                 | Limit                                                                |
| ------- | ---------------------- | -------------------------------------------------------------------- |
| Jobs    | Max. no. targets       | 100                                                                  |
| Things  | Max. groups membership | 10                                                                   |
| Things  | Group membership       | A Thing cannot belong to multiple grups that share a common ancestor |

## Command / Job Targets

When a command is published, an _AWS IoT Job_ is created to broadcast the command to the device for execution. The Thing ARN's are identified based on the target type provided as follows:

| Target Type              | Action                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| CDF Asset Library group  | The Thing ARN's of all active devices associated with the group are retrieved |
| CDF Asset Library device | The Thing ARN is retrieved for the device                                     |
| Thing ARN                | The Thing ARN is used directly                                                |
| Thing Group ARN          | The Thing Group ARN is used directly                                          |

If the total number of target Thing ARN's identified above exceeds the maximum allowed for a job, an ephemeral group is created to encompass the ARN's as the job target. Thing Group ARN's are intentionally not expanded in this way - if the number of provided Thing Group ARN's exceeds the maximum allowed targets for a Job, a validation error is thrown.

## Job LifeCycle Events

When jobs are completed or cancelled, messages are sent to the following MQTT reserved topics:

```sh
$aws/events/job/jobID/completed
$aws/events/job/jobID/canceled
```

Upon cancellation/completion, if an ephemeral group was created for the Job, it is automatically deleted by the _CDF Commands_ module.
