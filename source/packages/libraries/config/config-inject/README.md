# @cdf/config-inject

node-config variables are injected into inversify IoC container.
If you are using inversify with node-config this library will be useful.
If property is not found, injection will fail fast and you will get initialization error.

## Getting Started
Add "@cdf/config-inject": "^1.0.0" to the dependencies section of the package.json file or run: 
```
npm install @cdf/config-inject
```

## Usage
- Instantiate and load config injector into your inversify container
- add @inject annotation with config variables


Instante CDFConfigInjector in your inversify.config.js and load it into container as follows
```javascript
	import { CDFConfigInjector } from @cdf/config-inject;
	
    const configInjector = new CDFConfigInjector();
    container.load(configInjector.getConfigModule());
``` 
Inject config variables from config files into your services as follows
```javascript
@injectable()
export class TestService {
  constructor(@inject('aws.region') public awsRegion: string,
              @inject('aws.db.connection_url') public dbConnectionString: string) { }
}
```

Configuration YAML for above injection should look like :
```yaml
aws:
  region: 'us-west-2'
  db:
    connection_url: 'https://testdb'
```

