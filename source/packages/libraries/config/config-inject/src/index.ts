/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import 'reflect-metadata';
import { CDFLogger } from '@cdf/logger';

import { ContainerModule, interfaces} from 'inversify';
import * as config from 'config';

/* eslint-disable */ 

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
