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
 import { process, structure } from 'gremlin';
 import { injectable, inject } from 'inversify';
 import {logger} from '@awssolutions/simple-cdf-logger';
 import {TYPES} from '../di/types';
 import { BaseDaoFull } from '../data/base.full.dao';

 @injectable()
 export class InitDaoFull extends BaseDaoFull {

     public constructor(
         @inject('neptuneUrl') neptuneUrl: string,
         @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
     ) {
         super(neptuneUrl, graphSourceFactory);
     }

     public async isInitialized(): Promise<boolean> {
         logger.debug('init.dao isInitialized: in: ');

         let query;
         const conn = super.getConnection();
         try {
             query = await conn.traversal.V('type___device').next();
         } finally {
             conn.close();
         }

         logger.debug(`init.dao isInitialized: query: ${JSON.stringify(query)}`);

         let initialized=true;

         if (query===undefined || query.value===null) {
             initialized=false;
         }

         logger.debug(`init.dao isInitialized: exit: initialized: ${initialized}`);
         return initialized;
     }

     public async initialize(): Promise<void> {
         logger.debug('init.dao initialize: in:');

         const conn = super.getConnection();
         try {
             await conn.traversal.addV('type').property(process.t.id, 'type___device').
                 addV('type').property(process.t.id, 'type___group').
                 addV('root').property(process.t.id, 'group___/').property('name','/').property('groupPath','/').
                 iterate();
         } finally {
             conn.close();
         }
     }

     public async getVersion(): Promise<number> {
         logger.debug('init.dao getVersion: in: ');

         let results;
         const id = 'app_version';
         const conn = super.getConnection();
         try {
             results = await conn.traversal.V(id)
                 .valueMap('version').next();
         } finally {
             conn.close();
         }

         logger.debug(`init.dao getVersion: results: ${JSON.stringify(results)}`);

         let version=0;
         if (results?.value?.['version']) {
             version = results.value['version'][0] as number;
         }

         logger.debug(`init.dao getVersion: exit: version: ${version}`);
         return version;
     }

     public async setVersion(version:number): Promise<void> {
         logger.debug(`init.dao setVersion: in: version:${version}`);

         const currentVersion = await this.getVersion();
         const id = 'app_version';

         const conn = super.getConnection();
         if (currentVersion===0) {
             await conn.traversal.addV(id).
                 property(process.t.id, id).
                 property(process.cardinality.single, 'version', version).
                 iterate();
         } else {
             await conn.traversal.V(id).
                 property(process.cardinality.single, 'version', version).
                 iterate();
         }

         logger.debug(`init.dao setVersion: exit:`);
     }

     public async upgrade_from_0() : Promise<void> {
         logger.debug(`init.dao upgrade_from_0: in:`);

         const conn = super.getConnection();
         try {

             // set groupPath of root group '/'
             await conn.traversal.V('group___/').property('groupPath','/').iterate();

             await conn.traversal.V('type___device').as('type').
                 // add missing template id
                 property(process.cardinality.single, 'templateId', 'device').
                 // add type definition for the root device template
                 addV('typeDefinition').
                     property(process.t.id, 'type___device___1').
                     property(process.cardinality.single, 'version', 1).
                     property(process.cardinality.single, 'definition', JSON.stringify({
                         properties: {
                             deviceId: {
                                 type: 'string'
                             },
                             templateId: {
                                 type: 'string'
                             },
                             category: {
                                 type: ['string','null'],
                                 const: 'device'
                             },
                             name: {
                                 type: 'string'
                             },
                             description: {
                                 type: ['string','null']
                             },
                             imageUrl: {
                                 type: ['string','null']
                             },
                             awsIotThingArn: {
                                 type: ['string','null']
                             },
                             connected: {
                                 type: 'boolean'
                             },
                             state: {
                                 enum: ['unprovisioned', 'active', 'decommisioned', 'retired']
                             }
                         },
                         required: ['deviceId','templateId']
                     })).
                     property(process.cardinality.single, 'lastUpdated', new Date().toISOString()).
                     as('definition').
                 addE('current_definition').
                     property('status','published').
                     from_('type').to('definition').
                 next();

             // add type definition for the root group template
             await conn.traversal.V('type___group').as('type').
                 // add missing template id
                 property(process.cardinality.single, 'templateId', 'group').
                 // add type definition for the root group template
                 addV('typeDefinition').
                     property(process.t.id, 'type___group___1').
                     property(process.cardinality.single, 'version', 1).
                     property(process.cardinality.single, 'definition', JSON.stringify({
                         properties: {
                             groupPath: {
                                 type: 'string'
                             },
                             parentPath: {
                                 type: 'string'
                             },
                             templateId: {
                                 type: 'string'
                             },
                             category: {
                                 type: ['string'],
                                 const: 'group'
                             },
                             name: {
                                 type: 'string'
                             },
                             description: {
                                 type: ['string','null']
                             }
                         },
                         required: ['name','parentPath','templateId']
                     })).
                     property(process.cardinality.single, 'lastUpdated', new Date().toISOString()).
                     as('definition').
                 addE('current_definition').
                     property('status','published').
                     from_('type').to('definition').
                 next();

         } finally {
             conn.close();
         }

         logger.debug(`init.dao upgrade_from_0: exit:`);

     }
 }
