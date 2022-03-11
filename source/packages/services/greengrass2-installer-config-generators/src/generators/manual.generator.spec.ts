/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
 import 'reflect-metadata';

 import { ManualProvisioningConfig, manualProvisioningHandler } from './manual.generator';
 import { ConfigGeneratorEvent } from './models';
 
  describe('ManualProvisioningGenerator', () => {
 
     const handlerConfig:ManualProvisioningConfig = {
         certificateFilePath: '/somewhere/mockedCertificateFilePath',
         privateKeyPath: '/somewhere/mockedPrivateKeyPath',
         rootCaPath: '/somewhere/mockedRootCaPath',
         rootPath: '/somewhere/mockedRootPath',
         awsRegion: 'us-west-2',
         iotRoleAlias: 'mockedIotRoleAlias',
         iotDataEndpoint: 'somewhere-ats.iot.us-west-2.amazonaws.com',
         iotCredEndpoint: 'somewhere.credentials.iot.us-west-2.amazonaws.com'
     };
 
      it('happy path', async() => {
 
         const handler = manualProvisioningHandler(handlerConfig);
         const event:ConfigGeneratorEvent = {
             coreDeviceName: 'device001',
             version: '1.0.0'
         }
 
         const actual = await handler(event, undefined, undefined);
 
         const expected = 
         '---\n' +
         'system:\n' + 
         `  certificateFilePath: ${handlerConfig.certificateFilePath}\n` + 
         `  privateKeyPath: ${handlerConfig.privateKeyPath}\n` + 
         `  rootCaPath: ${handlerConfig.rootCaPath}\n` + 
         `  rootpath: ${handlerConfig.rootPath}\n` + 
         `  thingName: ${event.coreDeviceName}\n` + 
         'services:\n' + 
         '  aws.greengrass.Nucleus:\n' + 
         '    componentType: NUCLEUS\n' +
         `    version: ${event.version}\n` + 
         '    configuration:\n' + 
         `      awsRegion: ${handlerConfig.awsRegion}\n` + 
         `      iotRoleAlias: ${handlerConfig.iotRoleAlias}\n` + 
         `      iotDataEndpoint: ${handlerConfig.iotDataEndpoint}\n` + 
         `      iotCredEndpoint: ${handlerConfig.iotCredEndpoint}\n`;
 
         expect(actual).toBeDefined();
         expect(actual['config']).toEqual(expected);
         
 
      });
  
      it('missing version fails', async() => {
         
         const handler = manualProvisioningHandler(handlerConfig);
         const event:ConfigGeneratorEvent = {
             coreDeviceName: 'device001',
             version: undefined
         }
 
         await expect(handler(event, undefined, undefined))
         .rejects.toThrow();
 
      });
  
      it('missing core device name fails', async() => {
         
         const handler = manualProvisioningHandler(handlerConfig);
         const event:ConfigGeneratorEvent = {
             coreDeviceName: undefined,
             version: '1.0.0'
         }
 
         await expect(handler(event, undefined, undefined))
         .rejects.toThrow();
 
      });
   
  });
  