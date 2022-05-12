# Change Log - @cdf/assetlibrary

This log was last generated on Wed, 27 Apr 2022 06:44:55 GMT and should not be manually modified.

## 6.0.6
Wed, 27 Apr 2022 06:44:55 GMT

### Patches

- options request should not require claims check

## 6.0.5
Thu, 07 Apr 2022 05:00:50 GMT

### Patches

- minor formatting fix in readme

## 6.0.4
Wed, 30 Mar 2022 00:46:17 GMT

### Patches

- updated process of updating groups and devices so drops work
- replace deprecated String.prototype.substr()

## 6.0.3
Tue, 15 Mar 2022 18:37:51 GMT

### Patches

- Make Cloudformation templates more permissive w.r.t. Neptune instance types

## 6.0.2
Thu, 10 Mar 2022 00:08:34 GMT

### Patches

- added r5 instances to possible neptune DB selections

## 6.0.1
Thu, 17 Feb 2022 10:54:42 GMT

### Patches

- rollback the previous change where add associated roles to neptune

## 6.0.0
Thu, 17 Feb 2022 09:27:38 GMT

### Breaking changes

- migrate configuration to use dotenv-flow and deployment to use installer

## 5.4.3
Fri, 04 Feb 2022 17:03:38 GMT

### Patches

- Fix bulk data import into Neptune by associating NeptuneLoadFromS3Role with Neptune cluster

## 5.4.2
Tue, 25 Jan 2022 19:57:26 GMT

### Patches

- Fixes an error-level log message in request handler to correctly show a status code

## 5.4.1
Wed, 05 Jan 2022 18:34:59 GMT

### Patches

- Search query not constructed properly when a traversal search was specified followed by a non-traversal search.

## 5.4.0
Wed, 29 Dec 2021 20:21:35 GMT

### Minor changes

- Support for endsWith and contains search operators (full mode only)

## 5.3.9
Tue, 28 Dec 2021 18:37:09 GMT

### Patches

- Addressed github security dependabot alerts
- Fixes two issues with Asset Library (full mode) search. First, queries that used both comparison operators and certain other operators returned an error. Second, the optional useDFE side effect introduced in version 5.3.7 did not get correctly applied.

## 5.3.8
Wed, 08 Dec 2021 21:31:23 GMT

### Patches

- _Version update only_

## 5.3.7
Wed, 08 Dec 2021 17:48:56 GMT

### Patches

- The Asset Library search api was experiencing timeouts when attempting searches with 2 or more search criteria on large databases. Root cause analysis discovered an issue with Neptune itself in where an optimal query execution plan was not being executed. This was fixed with Neptune database engine V1.1.0.0.RC1. As part of planned downtime for maintentance, update your Neptune cluster to the latest DB engine.

## 5.3.6
Tue, 09 Nov 2021 18:18:19 GMT

### Patches

- Removed retrieving a groups related groups when all what was needed was to check the existence of a group. Returning related groups is performing poorly where groups are supernodes - they may have hundreds of thousands, or millions, of related devices, but to return related groups the related devices still need to be read then discarded. This improvement of the query that discards the devices is to follow.
- bug fix of create bulk group error message

## 5.3.5
Tue, 19 Oct 2021 23:02:07 GMT

### Patches

- Allow selection of neptune DB instance from deployment scripts
- add lowercasting to create group API

## 5.3.4
Wed, 29 Sep 2021 23:23:30 GMT

### Patches

- remove template from cache after being updated

## 5.3.3
Tue, 28 Sep 2021 22:04:37 GMT

### Patches

- Replaced references to CDF components being referred to as services to modules to avoid confusion with AWS services.
- Await neptune close connection
- Fixed errors in swagger docs.

## 5.3.2
Fri, 20 Aug 2021 16:07:58 GMT

### Patches

- fix broken type annotation

## 5.3.1
Wed, 11 Aug 2021 01:26:49 GMT

### Patches

- opensource related minor changes
- reverting chnages

## 5.3.0
Thu, 29 Jul 2021 00:16:37 GMT

### Minor changes

- adding middleware for express based services to remove path from request url to handle custom domain

## 5.2.0
Fri, 23 Jul 2021 16:14:32 GMT

### Minor changes

- Return the groupPath of new groups at time of creation as a header.

## 5.1.0
Fri, 23 Jul 2021 15:55:06 GMT

### Minor changes

- add optional parameter for user to specify neptune backup retention period (default to 15 days)

## 5.0.0
Wed, 21 Jul 2021 16:46:57 GMT

### Breaking changes

- Configured Neptune instance to be encrypted at rest. As this is a backwards incompatible change, the database cluster will need recreating. To aid this, specifying a Neptune snapshot to create a new cluster from has been exposed. In addition, the generated lambda bundle size has been reduced.

