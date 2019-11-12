/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure, driver } from 'gremlin';
import { injectable, inject } from 'inversify';
import {TYPES} from '../di/types';

@injectable()
export class BaseDaoFull {

    private _graph: structure.Graph;
    private _conn: driver.DriverRemoteConnection;

    public constructor(
        @inject('neptuneUrl') private neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        this._graph = graphSourceFactory();
    }

    protected getTraversalSource(): process.GraphTraversalSource {
        this._conn = new driver.DriverRemoteConnection(this.neptuneUrl, { mimeType: 'application/vnd.gremlin-v2.0+json' });

        return this._graph.traversal().withRemote(this._conn);
    }

    protected closeTraversalSource() {
        if (this._conn!==undefined) {
            this._conn.close();
        }
    }
}
