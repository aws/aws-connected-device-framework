import { CDFConfigInjector } from './index';

import { Container, injectable, inject } from 'inversify';

@injectable()
export class TestService {
  constructor(@inject('aws.region') public awsRegion: string,
              @inject('aws.db.connection_url') public dbConnectionString: string) { }
}

const container = new Container();
let theService: TestService;

describe('ConfigInjector', () => {
  beforeAll((done) => {
    const configInjector = new CDFConfigInjector();
    container.load(configInjector.getConfigModule());
    container.bind<TestService>('TheService').to(TestService);
    theService = container.get<TestService>('TheService');
    done();
  });
  // this.timeout(15000);
  describe('injected values', () => {
    it('should get valid access config data', async () => {
      expect(theService).toBeDefined();
      expect(theService.awsRegion).toEqual('us-west-2');
      expect(theService.dbConnectionString).toEqual('https://testdb');
    });

  });
});
