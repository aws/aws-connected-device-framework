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
export class ConnectionDaoFull {
    private _graph: structure.Graph;
    private _conn: driver.DriverRemoteConnection | null;

    public constructor(
        @inject('neptuneUrl') private neptuneUrl: string,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        this._graph = graphSourceFactory();
        this._conn = null;
    }

    public async withTraversal<T>(fn: (conn: NeptuneConnection) => Promise<T>): Promise<T> {
        logger.debug(`connection.full.dao withTraversal: in:`);
        if (this._conn == null) {
            logger.debug(`connection.full.dao withTraversal: create new connection:`);
            this._conn = new driver.DriverRemoteConnection(this.neptuneUrl, {
                mimeType: 'application/vnd.gremlin-v2.0+json',
                pingEnabled: false,
                connectOnStartup: false,
            });
        }

        return new Promise((resolve, reject) => {
            const closeListener = (code: number, message: string) => {
                logger.info(
                    `connection.full.dao connection close: code: ${code}, message: ${message}`
                );
                this._conn = null;
                if (code === 1006) {
                    reject(new Error('Connection closed prematurely'));
                }
            };

            this._conn.addListener('close', closeListener);

            this._conn
                .open()
                .then(() => {
                    logger.debug(`connection.full.dao getConnection: withRemote:`);
                    const conn = new NeptuneConnection(
                        this._graph.traversal().withRemote(this._conn)
                    );
                    fn(conn)
                        .then(resolve)
                        .catch(reject)
                        .finally(() => {
                            this._conn?.removeListener('close', closeListener);
                        });
                })
                .catch((e) => {
                    this._conn?.removeListener('close', closeListener);
                    reject(e);
                });
        });
    }
}

export class NeptuneConnection {
    constructor(private _traversal: process.GraphTraversalSource) {}

    public get traversal(): process.GraphTraversalSource {
        return this._traversal;
    }
}
