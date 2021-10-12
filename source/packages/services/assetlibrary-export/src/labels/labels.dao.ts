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

import { logger } from '../utils/logger';
import { TYPES } from '../di/types';

import { BaseDaoFull } from '../data/base.full.dao';
import { isVertexDto, VertexDto } from '../data/full.model';

@injectable()
export class LabelsDao extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listIdObjectsByLabels(labels: string[]): Promise<IdObject[]> {
        logger.debug(`labels.dao getDeviceIds: in: ${labels}`);

        let results: process.Traverser[];
        const conn = super.getConnection();

        try {
            const traverser = conn.traversal.V().hasLabel(...labels);
            logger.debug(`common.full.dao: traverser: ${JSON.stringify(traverser.toString())}`);
            results = await traverser.toList();
            logger.debug(`common.full.dao: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results===undefined || results.length===0) {
            logger.debug(`labels.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.debug(`labels.dao get: results: ${JSON.stringify(results)}`);

        const vertices = results.filter(r=> isVertexDto(r)) as VertexDto[];

        const entityIds = vertices.map(v => {
            return new IdObject(v);
        });

        return entityIds;
    }

}

export class IdObject {
    id: string;
    type: string;
    category: string;

    constructor(vertex: VertexDto) {
        const idComponents = vertex.id.split('___');
        const labelComponents = vertex.label.split('::');

        this.id = idComponents[1];
        this.category = idComponents[0];
        this.type = labelComponents.filter((l) => l !== this.category)[0];
    }
}
