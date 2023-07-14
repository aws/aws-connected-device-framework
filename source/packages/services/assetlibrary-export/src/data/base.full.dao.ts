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
import { logger } from '@awssolutions/simple-cdf-logger';
import { driver, process, structure } from 'gremlin';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';

@injectable()
export class BaseDaoFull {
    private _graph: structure.Graph;

    public constructor(
        @inject('neptuneUrl') private neptuneUrl: string,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph,
    ) {
        this._graph = graphSourceFactory();
    }

    protected getConnection(): NeptuneConnection {
        logger.debug(`base.full.dao getConnection: in:`);
        const conn = new driver.DriverRemoteConnection(this.neptuneUrl, {
            mimeType: 'application/vnd.gremlin-v2.0+json',
            pingEnabled: false,
        });

        logger.debug(`base.full.dao getConnection: withRemote:`);
        const res = new NeptuneConnection(this._graph.traversal().withRemote(conn), conn);

        logger.debug(`base.full.dao getConnection: exit:`);
        return res;
    }
}

export class NeptuneConnection {
    constructor(
        private _traversal: process.GraphTraversalSource,
        private _connection: driver.DriverRemoteConnection,
    ) {}

    public get traversal(): process.GraphTraversalSource {
        return this._traversal;
    }

    public async close(): Promise<void> {
        await this._connection.close();
    }
}
