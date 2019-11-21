/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure, driver } from 'gremlin';
import { injectable, inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';

@injectable()
export class BaseDaoFull {

    private _graph: structure.Graph;

    public constructor(
        @inject('neptuneUrl') private neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        this._graph = graphSourceFactory();
    }

    protected getConnection(): NeptuneConnection {
        logger.debug(`base.full.dao getConnection: in:`);
        const conn = new driver.DriverRemoteConnection(this.neptuneUrl, { mimeType: 'application/vnd.gremlin-v2.0+json' });

        logger.debug(`base.full.dao getConnection: withRemote:`);
        const res = new NeptuneConnection(
            this._graph.traversal().withRemote(conn),
            conn
        );

        logger.debug(`base.full.dao getConnection: exit:`);
        return res;
    }
}

export class NeptuneConnection {
    constructor(private _traversal:process.GraphTraversalSource, private _connection:driver.DriverRemoteConnection) {}

    public get traversal():process.GraphTraversalSource {
        return this._traversal;
    }

    public close() {
        this._connection.close();
    }
}
