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
import { inject, injectable } from 'inversify';
import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';

import { BaseDaoFull } from '../data/base.full.dao';
import { VertexDto, isVertexDto } from '../data/full.model';

@injectable()
export class LabelsDao extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async getObjectCountByLabel(label: string): Promise<{
        total: number;
    }> {
        logger.debug(`labels.dao getCountByLabel: in: ${label}`);

        ow(label, 'label', ow.string.nonEmpty);

        let result: process.Traverser[];
        const conn = super.getConnection();

        try {
            const traverser = conn.traversal.V().hasLabel(label).count();
            logger.silly(`common.full.dao: traverser: ${JSON.stringify(traverser.toString())}`);
            result = await traverser.toList();
            logger.silly(`common.full.dao: results: ${JSON.stringify(result)}`);
        } finally {
            await conn.close();
        }

        if (result === undefined || result.length === 0) {
            logger.debug(`labels.dao get: exit: node: undefined`);
            return undefined;
        }

        return {
            total: <number>(<unknown>result[0]),
        };
    }

    public async listIdObjectsByLabel(
        label: string,
        range: [number, number]
    ): Promise<IdObject[]> {
        logger.debug(`labels.dao getDeviceIds: in: ${label}, range: ${range}`);

        ow(label, 'label', ow.string.nonEmpty);
        ow(range, 'range', ow.array.nonEmpty);

        let results: process.Traverser[];
        const conn = super.getConnection();

        try {
            const traverser = conn.traversal.V().hasLabel(label).range(range[0], range[1]);
            logger.silly(`common.full.dao: traverser: ${JSON.stringify(traverser.toString())}`);
            results = await traverser.toList();
            logger.silly(`common.full.dao: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results === undefined || results.length === 0) {
            logger.debug(`labels.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.silly(`labels.dao get: results: ${JSON.stringify(results)}`);

        const vertices = results.filter((r) => isVertexDto(r)) as VertexDto[];

        return vertices.map((v) => {
            return new IdObject(v);
        });
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
