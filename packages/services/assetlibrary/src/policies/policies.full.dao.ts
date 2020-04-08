/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { PolicyModel, AttachedPolicy, Policy} from './policies.models';
import { TYPES } from '../di/types';
import { BaseDaoFull } from '../data/base.full.dao';

const __ = process.statics;

@injectable()
export class PoliciesDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async get(policyId: string): Promise<Policy> {
        logger.debug(`policy.full.dao get: in: policyId: ${policyId}`);

        const id = `policy___${policyId.toLowerCase()}`;

        let query;
        const conn = super.getConnection();
        try {
            query = await conn.traversal.V(id).as('policy').
                project('policy', 'groups').
                    by( __.select('policy').valueMap().with_(process.withOptions.tokens)).
                    by( __.select('policy').out('appliesTo').hasLabel('group').fold()).
                next();
        } finally {
            conn.close();
        }

        logger.debug(`policy.full.dao get: query: ${JSON.stringify(query)}`);

        if (query===undefined || query.value===null) {
            logger.debug(`policy.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const result = JSON.parse(JSON.stringify(query.value)) as Policy;
        logger.debug(`policy.full.dao get: exit: result: ${JSON.stringify(result)}`);
        return result;

    }

    public async create(model: PolicyModel): Promise<string> {
        logger.debug(`policies.dao create: in: model: ${JSON.stringify(model)}`);

        const id = `policy___${model.policyId.toLowerCase()}`;

        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.addV('policy')
                .property(process.t.id, id)
                .property('policyId', model.policyId.toLowerCase())
                .property('type', model.type)
                .property('description', model.description)
                .property('document', model.document)
                .as('policy');

            model.appliesTo.forEach((path,index)=> {
                this.addCreateAppliesToTraversal(path, index, traversal);
            });

            await traversal.iterate();
        } finally {
            conn.close();
        }

        logger.debug(`policies.dao create: exit: id: ${id}`);
        return id;
    }

    private addCreateAppliesToTraversal(path:string, identifier:number, traversal:process.GraphTraversal) {
        const groupId = `group___${path}`;
        const groupAlias = `group_added_${identifier}`;
        traversal.V(groupId).as(groupAlias)
            .addE('appliesTo').from_('policy').to(groupAlias);
    }

    private addRemoveAppliesToTraversal(path:string): process.GraphTraversal {
        const groupId = `group___${path}`;
        return __.select('policy').outE('appliesTo').where(__.otherV().hasId(groupId));
    }

    public async update(existing:PolicyModel, updated:PolicyModel): Promise<string> {
        logger.debug(`policies.dao update: in: existing:${JSON.stringify(existing)}, updated:${JSON.stringify(updated)}`);

        const id = `policy___${existing.policyId}`;

        /*  update the main policy object  */
        const conn = super.getConnection();
        try {
            const traversal = conn.traversal.V(id);

            if (updated.type) {
                traversal.property(process.cardinality.single, 'type', updated.type.toLowerCase());
            }
            if (updated.description) {
                traversal.property(process.cardinality.single, 'description', updated.description);
            }
            if (updated.document) {
                traversal.property(process.cardinality.single, 'document', updated.document);
            }
            traversal.as('policy');

            /*  identfy any changes in the appliesTo relationship  */
            const changedAppliesTo = this.identifyChangedAppliesTo(existing.appliesTo, updated.appliesTo);
            logger.debug(`policies.dao update: changedAppliesTo: ${JSON.stringify(changedAppliesTo)}`);

            /*  any new appliesTo we can simply add the step to the traversal  */
            changedAppliesTo.add.forEach((path,index)=> {
                this.addCreateAppliesToTraversal(path, index, traversal);
            });

            /*  as a drop() step terminates a traversal, we need to process all these as part of a single union step as the last step  */
            const removedAppliesToSteps: process.GraphTraversal[]= [];
            changedAppliesTo.remove.forEach((path)=> {
                removedAppliesToSteps.push(this.addRemoveAppliesToTraversal(path));
            });
            if (removedAppliesToSteps.length>0) {
                traversal.local(
                        __.union(...removedAppliesToSteps)
                    ).drop();
            }

            /*  lets execute it  */
            const query = await traversal.iterate();
            logger.debug(`policies.dao update: query: ${JSON.stringify(query)}`);
        } finally {
            conn.close();
        }

        logger.debug(`policies.dao update: exit: id: ${id}`);
        return id;
    }

    private identifyChangedAppliesTo(existing:string[], updated:string[]): ChangedAppliesTo  {

        const toRemove:string[]=[];
        const toAdd:string[]=[];

        // first find removed
        existing.forEach(e=> {
            if (!updated.includes(e)) {
                toRemove.push(e);
            }
        });

        // then find added
        toAdd.forEach(a => {
            if (!existing.includes(a)) {
                toAdd.push(a);
            }
        });

        return {
            add: toAdd,
            remove: toRemove
        };

    }

    public async listDeviceAttachedPolicies(deviceId:string, type:String): Promise<AttachedPolicy[]> {
        logger.debug(`policies.dao listDeviceAttachedPolicies: in: deviceId:${deviceId}, type:${type}`);

        const id = `device___${deviceId.toLowerCase()}`;

        let results;
        const conn = super.getConnection();
        try {
            results = await conn.traversal.V(id).as('device')
            .union(
                __.out(),
                __.out().repeat(__.out('parent').simplePath().dedup()).emit()
                ).as('deviceGroups')
            .in_('appliesTo').hasLabel('policy').has('type',type).dedup().as('policies')
            .project('policy', 'groups', 'policyGroups')
                .by( __.identity().valueMap().with_(process.withOptions.tokens))
                .by( __.select('device').out().hasLabel('group').fold())
                .by( __.local( __.out('appliesTo').fold())).
            toList();
        } finally {
            conn.close();
        }

        const policies: AttachedPolicy[]=[];
        for(const result of results) {
            policies.push(JSON.parse(JSON.stringify(result)) as AttachedPolicy);
        }

        logger.debug(`policies.dao listDeviceAttachedPolicies: exit: policies: ${JSON.stringify(policies)}`);
        return policies;
    }

    public async listGroupAttachedPolicies(groupPaths:string[], type:String): Promise<AttachedPolicy[]> {
        logger.debug(`policies.dao listGroupAttachedPolicies: in: groupPaths:${groupPaths}, type:${type}`);

        const ids:string[]=[];
        groupPaths.forEach(v=> ids.push(`group___${v.toLowerCase()}`));

        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(ids).as('groups').
                union(
                    __.identity(),
                    __.repeat(__.out('parent').simplePath().dedup()).emit()
                ).as('parentGroups').
                in_('appliesTo').hasLabel('policy');

            if (type!==undefined) {
                traverser.has('type',type);
            }

            traverser.dedup().as('policies')
                .project('policy', 'groups', 'policyGroups')
                    .by( __.identity().valueMap().with_(process.withOptions.tokens))
                    .by( __.select('groups').fold())
                    .by( __.local( __.out('appliesTo').fold()));

            results = await traverser.toList();
        } finally {
            conn.close();
        }

        const policies: AttachedPolicy[]=[];
        for(const result of results) {
            policies.push(JSON.parse(JSON.stringify(result)) as AttachedPolicy);
        }

        logger.debug(`policies.dao listGroupAttachedPolicies: exit: policies: ${JSON.stringify(policies)}`);
        return policies;
    }

    public async listPolicies(type:string, offset:number, count:number): Promise<Policy[]> {
        logger.debug(`policies.dao listPolicies: type:${type}, offset:${offset}, count:${count}`);

        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V().hasLabel('policy');
            if (type!==undefined) {
                traverser.has('type', type.toLowerCase());
            }
            traverser.as('policies').
                project('policy', 'groups').
                    by( __.valueMap().with_(process.withOptions.tokens)).
                    by( __.out('appliesTo').hasLabel('group').fold());

            // apply pagination
            if (offset!==undefined && count!==undefined) {
                // note: workaround for wierd typescript issue. even though offset/count are declared as numbers
                // througout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
                const offsetAsInt = parseInt(offset.toString(),0);
                const countAsInt = parseInt(count.toString(),0);
                traverser.range(offsetAsInt, offsetAsInt + countAsInt);
            }

            results = await traverser.toList();
        } finally {
            conn.close();
        }

        logger.debug(`results: ${JSON.stringify(results)}`);

        const policies: Policy[]=[];
        for(const result of results) {
            policies.push(JSON.parse(JSON.stringify(result)) as Policy);
        }

        logger.debug(`policies.dao listPolicies: exit: policies: ${JSON.stringify(policies)}`);
        return policies;
    }

    public async delete(policyId: string): Promise<void> {
        logger.debug(`policies.dao delete: in: policyId:${policyId}`);

        const dbId = `policy___${policyId.toLowerCase()}`;

        const conn = super.getConnection();
        try {
            await conn.traversal.V(dbId).drop().next();
        } finally {
            conn.close();
        }

        logger.debug(`policies.dao delete: exit`);
    }
}

interface ChangedAppliesTo {
    remove: string[];
    add: string[];
}
