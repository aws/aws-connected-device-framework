# Asset Library integration tests

Note:  only the _full_ mode is tested as part of the CI/CD pipeline.  We need to add both the _full (witht FGAC)_ and _lite_ modes to it.  But for now, these need testing manually...

### Testing full-with-authz mode

- Run asset library with FGAC enabled (only supported in _full_ mode):
```sh
$ assetlibrary> CONFIG_LOCATION="../../../../cdf-infrastructure-demo" ASSETLIBRARY_AUTHORIZATION_ENABLED=true  npm run start
```
- Run FGAC specific integration tests:
```sh
$ integration-tests> CONFIG_LOCATION="../../../cdf-infrastructure-demo" pnpm run integration-test  -- features/assetlibrary/full-with-authz/*
```

### Testing lite mode

- Run asset library in _lite_ mode:
```sh
$ assetlibrary> CONFIG_LOCATION="../../../../cdf-infrastructure-demo" ASSETLIBRARY_MODE=lite  npm run start
```
- Run FGAC specific integration tests:
```sh
$ integration-tests> CONFIG_LOCATION="../../../cdf-infrastructure-demo" pnpm run integration-test  -- features/assetlibrary/lite/*
```

### Testing full mode

- Run asset library in the default _full_ mode (requires a Neptune tunnel of running loc)
```sh
$ assetlibrary> CONFIG_LOCATION="../../../../cdf-infrastructure-demo" npm run start
```
- Run FGAC specific integration tests:
```sh
$ integration-tests> CONFIG_LOCATION="../../../cdf-infrastructure-demo" pnpm run integration-test  -- features/assetlibrary/full/*
```