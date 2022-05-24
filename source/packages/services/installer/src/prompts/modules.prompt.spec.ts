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
import { Module, ModuleName } from '../models/modules';
import { expandModuleList, topologicallySortModules } from './modules.prompt';

describe('modules', () => {

  const m: Module = {
    friendlyName: '',
    name: 'apigw',
    dependsOnMandatory: [],
    dependsOnOptional: [],
    prompts: undefined,
    install: undefined,
    package: undefined,
    delete: undefined,
    type: 'SERVICE'
  };

  // greengrass2-provisioning -> provisioning -> apigw
  //                          -> provisioning -> vpc (optional)
  //                          -> provisioning -> openssl
  // greengrass2-provisioning -> vpc (optional)
  // commands -> assetlibrary  -> apigw
  //             assetlibrary  -> vpc (optional)
  // bulkcerts -> openssl
  // eventbus

  const modules: Module[] = [
    { ...m, name: 'apigw' },
    { ...m, name: 'assetLibrary', dependsOnMandatory: ['apigw'], dependsOnOptional: ['vpc'] },
    { ...m, name: 'bulkCerts', dependsOnMandatory: ['openSsl'] },
    { ...m, name: 'commands', dependsOnMandatory: ['assetLibrary'] },
    { ...m, name: 'eventBus' },
    { ...m, name: 'greengrass2Provisioning', dependsOnMandatory: ['provisioning'], dependsOnOptional: ['vpc'] },
    { ...m, name: 'openSsl' },
    { ...m, name: 'provisioning', dependsOnMandatory: ['apigw', 'openSsl'], dependsOnOptional: ['vpc'] },
    { ...m, name: 'vpc' },
  ];

  it('expand dependencies (mandatory)', async () => {

    const chosen: ModuleName[] = ['greengrass2Provisioning', 'bulkCerts'];

    // execute
    const actual = expandModuleList(modules, chosen, false);

    // verify
    expect(actual).toBeDefined();
    expect(actual.length).toBe(5);
    expect(actual.some(m => m === 'greengrass2Provisioning')).toBeTruthy();
    expect(actual.some(m => m === 'provisioning')).toBeTruthy();
    expect(actual.some(m => m === 'apigw')).toBeTruthy();
    expect(actual.some(m => m === 'openSsl')).toBeTruthy();
    expect(actual.some(m => m === 'bulkCerts')).toBeTruthy();

  });

  it('expand dependencies (including optional)', async () => {

    const chosen: ModuleName[] = ['greengrass2Provisioning', 'bulkCerts'];

    // execute
    const actual = expandModuleList(modules, chosen, true);

    // verify
    expect(actual).toBeDefined();
    expect(actual.length).toBe(6);
    expect(actual.some(m => m === 'greengrass2Provisioning')).toBeTruthy();
    expect(actual.some(m => m === 'provisioning')).toBeTruthy();
    expect(actual.some(m => m === 'apigw')).toBeTruthy();
    expect(actual.some(m => m === 'openSsl')).toBeTruthy();
    expect(actual.some(m => m === 'bulkCerts')).toBeTruthy();
    expect(actual.some(m => m === 'vpc')).toBeTruthy();

  });

  it('topological sort', () => {

    // execute
    const actual = topologicallySortModules(modules, modules.map(m => m.name));

    // verify
    expect(actual).toBeDefined();
    expect(actual[0]).toContain('apigw');
    expect(actual[0]).toContain('eventBus');
    expect(actual[0]).toContain('openSsl');
    expect(actual[0]).toContain('vpc');
    expect(actual[1]).toContain('assetLibrary');
    expect(actual[1]).toContain('bulkCerts');
    expect(actual[1]).toContain('provisioning');
    expect(actual[2]).toContain('commands');
    expect(actual[2]).toContain('greengrass2Provisioning');

  });

});
