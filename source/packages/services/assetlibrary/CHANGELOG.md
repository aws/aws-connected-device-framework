# Change Log - @cdf/assetlibrary

This log was last generated on Wed, 08 Dec 2021 21:31:23 GMT and should not be manually modified.

## 5.3.8
Wed, 08 Dec 2021 21:31:23 GMT

### Patches

- Allow selection of neptune DB instance from deployment scripts
- Removed retrieving a groups related groups when all what was needed was to check the existence of a group. Returning related groups is performing poorly where groups are supernodes - they may have hundreds of thousands, or millions, of related devices, but to return related groups the related devices still need to be read then discarded. This improvement of the query that discards the devices is to follow.
- add lowercasting to create group API
- bug fix of create bulk group error message

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

