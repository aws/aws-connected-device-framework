# Change Log for the pre-Rush (<v5) version of @cdf/bulkcerts

## [@cdf/bulkcerts-v4.3.2](@cdf/bulkcerts-v4.3.1...@cdf/bulkcerts-v4.3.2) (2020-12-21)

### Bug Fixes

* **events-processor:** safe target deletion ([23c268d](23c268d1ca40e1b53c8d371f8fb22d0bf34c885f))


## [@cdf/bulkcerts-v4.3.1](@cdf/bulkcerts-v4.3.0...@cdf/bulkcerts-v4.3.1) (2020-06-10)


### Bug Fixes

* **cicd:** cicd building extra node_modules layer ([b019111](b019111adadea7bac04ed3aaa35254c3137615e0))

## [@cdf/bulkcerts-v4.3.0](@cdf/bulkcerts-v4.2.0...@cdf/bulkcerts-v4.3.0) (2020-06-10)


### Bug Fixes

* **cdf:** reduced lambda bundle size ([1ce9877](1ce9877878831dac78b00ddbc5589cadead19d53))
* committing latest ([335c842](335c84223ab2a860c52766559b220170a64c7c17))


### Features

* **apis:** api key and private api auth support ([03240fa](03240fad4867ada8d9babd68d1124e6e4f7770da))
* **auth:** complete private api and api key auth modes ([46d0183](46d0183e779e21a7ad39e879481b369bec2d060f))

## [@cdf/bulkcerts-v4.2.0](@cdf/bulkcerts-v4.1.4...@cdf/bulkcerts-v4.2.0) (2020-05-29)


### Features

* **greengrass:** provisioning and deployment service ([5072214](5072214fb81a0d6a8f8641bf0f52fefb7f2ad950))

## [@cdf/bulkcerts-v4.1.4](@cdf/bulkcerts-v4.1.3...@cdf/bulkcerts-v4.1.4) (2020-01-31)


### Bug Fixes

* **bulkcerts:** openssl support ([c20943f](c20943ff8594b614fda6adf04c2d8a7388d997d9))

## [@cdf/bulkcerts-v4.1.3](@cdf/bulkcerts-v4.1.2...@cdf/bulkcerts-v4.1.3) (2020-01-31)


### Bug Fixes

* **openssl:** replace export values as they cannot be updated ([fabf047](fabf047016b3c57b3bf56108fc9a6ce9fbeb44e5))

## [@cdf/bulkcerts-v4.1.2](@cdf/bulkcerts-v4.1.1...@cdf/bulkcerts-v4.1.2) (2020-01-30)


### Bug Fixes

* **openssl:** openssl now available via a lambda layer ([8399408](8399408649b2a8f3074500c1ae43844dd3f5147a))

## [@cdf/bulkcerts-v4.1.1](@cdf/bulkcerts-v4.1.0...@cdf/bulkcerts-v4.1.1) (2020-01-15)


### Bug Fixes

* **assetlibrary:** search query updated to support authz ([e5c31db](e5c31db609841406d98733e62e3ed93073ffbb1f))

## [@cdf/bulkcerts-v4.1.0](@cdf/bulkcerts-v4.0.0...@cdf/bulkcerts-v4.1.0) (2019-12-19)


### Bug Fixes

* cleaned up log messages ([d49403d](d49403d11f3f73ea8c5ce061bfa790ec40cd8c13))


### Features

* **cdf:** upgraded from node.js v8 to v12 ([e47299e](e47299ee399acf6554a0845048c4fed99251c2b1))

## [@cdf/bulkcerts-v4.0.0](@cdf/bulkcerts-v3.2.0...@cdf/bulkcerts-v4.0.0) (2019-11-08)


### Bug Fixes

* **assetlibrary:** merge master ([3ba06fa](3ba06fa9fc5b264ceaed0f97ccf45fab97d57a08))


### Features

* **assetlibrary:** finished fine grained access control ([51a1d13](51a1d134ec48be2d62edc575998752ff866230bf))


### BREAKING CHANGES

* **assetlibrary:** asset library device/groups versioned to v2

## [@cdf/bulkcerts-v3.2.0](@cdf/bulkcerts-v3.1.2...@cdf/bulkcerts-v3.2.0) (2019-06-30)


### Features

* **assetlibrary:** new endpoints ([c936638](c936638))

## [@cdf/bulkcerts-v3.1.2](@cdf/bulkcerts-v3.1.1...@cdf/bulkcerts-v3.1.2) (2019-06-28)


### Bug Fixes

* **cors:** added missing dependency ([5e0f6b4](5e0f6b4))

## [@cdf/bulkcerts-v3.1.1](@cdf/bulkcerts-v3.1.0...@cdf/bulkcerts-v3.1.1) (2019-06-20)


### Bug Fixes

* **versioning:** fixed supported versioning of rest apis ([a8659ad](a8659ad))

## [@cdf/bulkcerts-v3.1.0](@cdf/bulkcerts-v3.0.0...@cdf/bulkcerts-v3.1.0) (2019-05-14)


### Features

* 🎸 events ([dfbba67](dfbba67))
* **events:** added pagination, swagger, and event rule parameters ([ad655c7](ad655c7))

## [@cdf/bulkcerts-v3.0.0](@cdf/bulkcerts-v2.0.0...@cdf/bulkcerts-v3.0.0) (2019-04-23)


### Features

* **bulkcerts:** aws iot ca for bulk certs ([2a2fd77](2a2fd77))


### BREAKING CHANGES

* **bulkcerts:** No longer can do a POST to /certificates to get a "default" CA.