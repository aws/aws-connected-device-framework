import 'reflect-metadata';
import { CDFLogger } from '@cdf/logger';

import { ContainerModule, interfaces} from 'inversify';
import * as config from 'config';

/**
 * Injector for injecting node-config variables into inversify IOC container.
 *
 * @type {CDFConfigInjector}
 * @module CDFConfigInjector
 */
export class CDFConfigInjector {
  private configContainer: ContainerModule;

  /**
   * Constructor
   */
  constructor(private logger?: CDFLogger) {
    if (!this.logger) {
      this.logger = new CDFLogger('info');
    }

    this.configContainer = new ContainerModule((bind: interfaces.Bind, _unbind: interfaces.Unbind) => {
      const configRoot: object = config;
      this.bindObjectProperties(bind, configRoot);
    });
    this.logger.debug(`Constructed config container`);
  }

  /**
   * Getter for config module. Use this to load properties in your roort DI container
   */
  public getConfigModule(): ContainerModule {
    return this.configContainer;
  }

  private bindObjectProperties(bind: interfaces.Bind, object: object, prefix?: string) {
    const attPrefix = prefix && prefix.length > 0 ? prefix + '.' : '';

    for (const propertyName in object) {
      if (object.hasOwnProperty(propertyName)) {
        this.bindObjectProperty(bind, (object as any)[propertyName], attPrefix + propertyName);
      }
    }
  }

  private bindObjectProperty(bind: interfaces.Bind, val: any, path: string) {
    switch (typeof val) {
      case 'string':
        bind<string>(path).toConstantValue(val);
        break;
      case 'number':
        bind<number>(path).toConstantValue(val);
        break;
      case 'boolean':
        bind<boolean>(path).toConstantValue(val);
        break;
      case 'object':
        if (val instanceof Array) {
          bind<any[]>(path).toConstantValue(val);
        } else if (typeof val === 'object') {
          this.bindObjectProperties(bind, val, path);
        }
        break;
      default:
        this.logger.info(`encountered unknown type for ${val}`);
        bind<any>(path).toConstantValue(val);
    }
  }
}
