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
import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import {
    TypeModel,
    TypeVersionModel,
    TypeRelationsModel,
    TypeDefinitionStatus,
    isRelationTargetExpanded,
    RelationTarget,
    RelationTargetExpanded,
} from './types.models';
import * as jsonpatch from 'fast-json-patch';
import { TypeCategory } from './constants';
import { DirectionToStringArrayMap, SortKeys } from '../data/model';
import { BaseDaoFull } from '../data/base.full.dao';
import { TemplateNotFoundError } from '../utils/errors';

const __ = process.statics;

@injectable()
export class TypesDaoFull extends BaseDaoFull {
    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph,
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async get(
        templateId: string,
        category: TypeCategory,
        status: TypeDefinitionStatus,
    ): Promise<TypeModel> {
        logger.debug(
            `types.full.dao get: in: templateId: ${templateId}, category: ${category}, status: ${status}`,
        );

        const dbId = `type___${templateId}`;

        let result;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(dbId).as('type');

            if (category !== undefined) {
                const superId = `type___${category}`;
                traverser.out('super_type').has(process.t.id, superId);
            }

            // only return published relations when we're looking at published definitions
            let relationsTraversal: process.GraphTraversal;
            if (status === TypeDefinitionStatus.draft) {
                relationsTraversal = __.bothE('relationship')
                    .valueMap()
                    .with_(process.withOptions.tokens)
                    .fold();
            } else {
                relationsTraversal = __.as('definition')
                    .bothE('relationship')
                    .match(
                        __.as('relationship')
                            .otherV()
                            .inE('current_definition')
                            .has('status', TypeDefinitionStatus.published)
                            .as('other'),
                    )
                    .select('relationship')
                    .valueMap()
                    .with_(process.withOptions.tokens)
                    .fold();
            }

            traverser
                .select('type')
                .outE('current_definition')
                .has('status', status)
                .inV()
                .as('definition')
                .project('type', 'definition', 'relations')
                .by(__.select('type').valueMap().with_(process.withOptions.tokens))
                .by(__.valueMap().with_(process.withOptions.tokens).fold())
                .by(relationsTraversal);

            result = await traverser.toList();

            // logger.debug(`types.full.dao get: traverser: ${traverser.toString()}`);
        } finally {
            await conn.close();
        }

        logger.debug(`types.full.dao get: query: ${JSON.stringify(result)}`);

        if (result === undefined || result.length === 0) {
            logger.debug(`types.full.dao get: exit: query: undefined`);
            return undefined;
        }

        const model = this.toModel(result[0], status, category);
        logger.debug(`types.full.dao get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async list(
        category: TypeCategory,
        status: TypeDefinitionStatus,
        offset: number,
        count: number,
        sort?: SortKeys,
    ): Promise<TypeModel[]> {
        logger.debug(
            `types.full.dao list: in: category:${category}, status:${status}, offset:${offset}, count:${count}`,
        );

        const superId = `type___${category}`;

        // only return published relations when we're looking at published definitions
        let relationsTraversal: process.GraphTraversal;
        if (status === TypeDefinitionStatus.draft) {
            relationsTraversal = __.bothE('relationship')
                .valueMap()
                .with_(process.withOptions.tokens)
                .fold();
        } else {
            relationsTraversal = __.as('definition')
                .bothE('relationship')
                .match(
                    __.as('relationship')
                        .otherV()
                        .inE('current_definition')
                        .has('status', TypeDefinitionStatus.published)
                        .as('other'),
                )
                .select('relationship')
                .valueMap()
                .with_(process.withOptions.tokens)
                .fold();
        }

        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(superId).inE('super_type').outV().as('a');

            // apply sorting
            if (sort?.length > 0) {
                traverser.order();
                sort.forEach((s) => {
                    const order = s.direction === 'ASC' ? process.order.asc : process.order.desc;
                    traverser.by(__.coalesce(__.values(s.field), __.constant('')), order);
                });
                traverser.as('a');
            }

            traverser
                .outE('current_definition')
                .has('status', status)
                .inV()
                .as('def')
                .project('type', 'definition', 'relations')
                .by(__.select('a').valueMap().with_(process.withOptions.tokens))
                .by(__.select('def').valueMap().with_(process.withOptions.tokens).fold())
                .by(relationsTraversal);

            // apply pagination
            if (offset !== undefined && count !== undefined) {
                // note: workaround for wierd typescript issue. even though offset/count are declared as numbers
                // througout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
                const offsetAsInt = parseInt(offset.toString(), 0);
                const countAsInt = parseInt(count.toString(), 0);
                traverser.range(offsetAsInt, offsetAsInt + countAsInt);
            }

            results = await traverser.toList();
        } finally {
            await conn.close();
        }

        logger.debug(`types.full.dao get: results: ${JSON.stringify(results)}`);

        if (results === undefined || results.length === 0) {
            logger.debug(`types.full.dao list: exit: results: undefined`);
            return undefined;
        }

        const r: TypeModel[] = [];
        for (const result of results) {
            r.push(this.toModel(result, status, category));
        }

        logger.debug(`types.full.dao list: exit: r: ${JSON.stringify(r)}`);
        return r;
    }

    public async create(model: TypeModel): Promise<void> {
        logger.debug(`types.full.dao create: in: model: ${JSON.stringify(model)}`);

        const superId = `type___${model.category}`;
        const id = `type___${model.templateId}`;
        const defId = `${id}___v${model.schema.version}`;

        let result;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(superId)
                .as('superType')
                .addV('type')
                .property(process.t.id, id)
                .property(process.cardinality.single, 'templateId', model.templateId)
                .as('type')
                .addV('typeDefinition')
                .property(process.t.id, defId)
                .property(process.cardinality.single, 'version', model.schema.version)
                .property(
                    process.cardinality.single,
                    'definition',
                    JSON.stringify(model.schema.definition),
                )
                .property(process.cardinality.single, 'lastUpdated', new Date().toISOString())
                .as('definition')
                .addE('current_definition')
                .property('status', 'draft')
                .from_('type')
                .to('definition')
                .addE('super_type')
                .from_('type')
                .to('superType');

            this.addCreateRelationStepsToTraversal(
                model.schema.relations,
                model.templateId,
                traverser,
            );

            logger.silly(
                `types.full.dao create: traverser: ${JSON.stringify(traverser.toString())}`,
            );
            result = await traverser.next();
            logger.silly(`types.full.dao create: result: ${JSON.stringify(result)}`);
        } finally {
            await conn.close();
        }

        if (result === undefined) {
            logger.debug(`types.full.dao create: exit: query: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao create: exit:`);
    }

    private addCreateRelationStepsToTraversal(
        rels: TypeRelationsModel,
        templateId: string,
        traverser: process.GraphTraversal,
    ) {
        if (rels?.out) {
            for (const relation of Object.keys(rels.out)) {
                rels.out[relation].sort();
                for (const t of rels.out[relation]) {
                    const templateName = isRelationTargetExpanded(t) ? t.name : t;
                    const includeInAuth = isRelationTargetExpanded(t)
                        ? t.includeInAuth
                        : undefined;
                    this.addCreateOutboundRelationStepToTraversal(
                        templateId,
                        templateName,
                        relation,
                        includeInAuth,
                        traverser,
                    );
                }
            }
        }

        if (rels?.in) {
            for (const relation of Object.keys(rels.in)) {
                rels.in[relation].sort();
                for (const t of rels.in[relation]) {
                    const templateName = isRelationTargetExpanded(t) ? t.name : t;
                    const includeInAuth = isRelationTargetExpanded(t)
                        ? t.includeInAuth
                        : undefined;
                    this.addCreateInboundRelationStepToTraversal(
                        templateId,
                        templateName,
                        relation,
                        includeInAuth,
                        traverser,
                    );
                }
            }
        }
    }

    private addCreateOutboundRelationStepToTraversal(
        templateId: string,
        outTemplate: string,
        relation: string,
        includeInAuth: boolean,
        traverser: process.GraphTraversal,
    ) {
        logger.debug(
            `types.full.dao addCreateOutboundRelationStepToTraversal: in: templateId:${templateId}, outTemplate:${outTemplate}, relation:${relation}, includeInAuth:${includeInAuth}`,
        );

        templateId = templateId.toLowerCase();
        outTemplate = outTemplate.toLowerCase();
        relation = relation.toLowerCase();

        const status = this.typeDefinitionStatusToLink(templateId, outTemplate);

        traverser
            .V(`type___${outTemplate}`)
            .outE('current_definition')
            .has('status', status)
            .inV()
            .as(`rel_out_${outTemplate}`)
            .addE('relationship')
            .property('name', relation)
            .property('fromTemplate', templateId)
            .property('toTemplate', outTemplate);

        if (includeInAuth) {
            traverser.property('includeInAuth', true);
        }

        traverser.from_('definition').to(`rel_out_${outTemplate}`);
    }

    private addCreateInboundRelationStepToTraversal(
        templateId: string,
        inTemplate: string,
        relation: string,
        includeInAuth: boolean,
        traverser: process.GraphTraversal,
    ) {
        logger.debug(
            `types.full.dao addCreateInboundRelationStepToTraversal: in: templateId:${templateId}, inTemplate:${inTemplate}, relation:${relation}`,
        );

        templateId = templateId.toLowerCase();
        inTemplate = inTemplate.toLowerCase();
        relation = relation.toLowerCase();

        const status = this.typeDefinitionStatusToLink(templateId, inTemplate);

        traverser
            .V(`type___${inTemplate}`)
            .outE('current_definition')
            .has('status', status)
            .inV()
            .as(`rel_in_${inTemplate}`)
            .addE('relationship')
            .property('name', relation)
            .property('fromTemplate', inTemplate)
            .property('toTemplate', templateId);

        if (includeInAuth) {
            traverser.property('includeInAuth', true);
        }

        traverser.from_(`rel_in_${inTemplate}`).to('definition');
    }

    private typeDefinitionStatusToLink(fromTemplateId: string, toTemplateId: string): string {
        // if attempting to link a type to itself, we have to use the draft version of it so
        // that the correct linked version is referenced when published.
        return fromTemplateId === toTemplateId ? 'draft' : 'published';
    }

    public async updateDraft(existing: TypeModel, updated: TypeModel): Promise<void> {
        logger.debug(
            `types.full.dao updateDraft: in: existing: ${JSON.stringify(
                existing,
            )}, updated: ${JSON.stringify(updated)}`,
        );

        const id = `type___${existing.templateId}`;

        let result;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(id)
                .outE('current_definition')
                .has('status', 'draft')
                .inV()
                .as('definition')
                .property(
                    process.cardinality.single,
                    'definition',
                    JSON.stringify(updated.schema.definition),
                )
                .property(process.cardinality.single, 'lastUpdated', new Date().toISOString());

            if (updated.schema.relations) {
                const changedRelations = this.identifyChangedRelations(
                    existing.schema.relations,
                    updated.schema.relations,
                );
                logger.debug(
                    `types.full.dao updateDraft: changedRelations: ${JSON.stringify(
                        changedRelations,
                    )}`,
                );

                const removedRelations: process.GraphTraversal[] = [];

                Object.keys(changedRelations.remove.in).forEach((key) => {
                    changedRelations.remove.in[key].forEach((value) => {
                        removedRelations.push(
                            __.select('definition')
                                .inE('relationship')
                                .has('name', key)
                                .has('fromTemplate', value),
                        );
                    });
                });

                Object.keys(changedRelations.remove.out).forEach((key) => {
                    changedRelations.remove.out[key].forEach((value) => {
                        removedRelations.push(
                            __.select('definition')
                                .outE('relationship')
                                .has('name', key)
                                .has('toTemplate', value),
                        );
                    });
                });

                if (removedRelations.length > 0) {
                    traverser
                        .select('definition')
                        .local(__.union(...removedRelations))
                        .drop();
                }

                Object.keys(changedRelations.add.in).forEach((relation) => {
                    changedRelations.add.in[relation].forEach((t) => {
                        const templateName = isRelationTargetExpanded(t) ? t.name : t;
                        const includeInAuth = isRelationTargetExpanded(t)
                            ? t.includeInAuth
                            : undefined;
                        this.addCreateInboundRelationStepToTraversal(
                            existing.templateId,
                            templateName,
                            relation,
                            includeInAuth,
                            traverser,
                        );
                    });
                });

                Object.keys(changedRelations.add.out).forEach((relation) => {
                    changedRelations.add.out[relation].forEach((t) => {
                        const templateName = isRelationTargetExpanded(t) ? t.name : t;
                        const includeInAuth = isRelationTargetExpanded(t)
                            ? t.includeInAuth
                            : undefined;
                        this.addCreateOutboundRelationStepToTraversal(
                            existing.templateId,
                            templateName,
                            relation,
                            includeInAuth,
                            traverser,
                        );
                    });
                });
            }

            logger.silly(`types.full.dao updateDraft: traverser: ${JSON.stringify(traverser)}`);
            result = await traverser.next();
            logger.silly(`types.full.dao updateDraft: result: ${JSON.stringify(result)}`);
        } finally {
            await conn.close();
        }

        if (result === undefined || result.value === null) {
            logger.debug(`types.full.dao updateDraft: exit: result: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao updateDraft: exit:`);
    }

    /**
     * Wrapper around existing private method to allow for unit testing
     * @param existing
     * @param updated
     */
    public __private___identifyChangedRelations(
        existing: TypeRelationsModel,
        updated: TypeRelationsModel,
    ): ChangedRelations {
        return this.identifyChangedRelations(existing, updated);
    }

    private identifyChangedRelations(
        existing: TypeRelationsModel,
        updated: TypeRelationsModel,
    ): ChangedRelations {
        logger.debug(
            `types.full.dao identifyChangedRelations: in: existing: ${JSON.stringify(
                existing,
            )}, updated: ${JSON.stringify(updated)}`,
        );

        // before we diff, sort the relations.  this avoids reporting any unnecessary modifications where just the ordering may have changed
        const sortRelationTarget = (a: RelationTarget, b: RelationTarget) => {
            const aName = isRelationTargetExpanded(a) ? a.name : a;
            const bName = isRelationTargetExpanded(b) ? b.name : b;
            return aName.localeCompare(bName);
        };
        if (existing?.in) {
            for (const key of Object.keys(existing.in)) {
                existing.in[key] = existing.in[key].sort(sortRelationTarget);
            }
        }
        if (existing?.out) {
            for (const key of Object.keys(existing.out)) {
                existing.out[key] = existing.out[key].sort(sortRelationTarget);
            }
        }
        if (updated?.in) {
            for (const key of Object.keys(updated.in)) {
                updated.in[key] = updated.in[key].sort(sortRelationTarget);
            }
        }
        if (updated?.out) {
            for (const key of Object.keys(updated.out)) {
                updated.out[key] = updated.out[key].sort(sortRelationTarget);
            }
        }

        // perform a diff of the relations so we can determine what specifically to add and remove
        logger.silly(
            `types.full.dao identifyChangedRelations: sorted: existing: ${JSON.stringify(
                existing,
            )}, updated: ${JSON.stringify(updated)}`,
        );
        const diff = jsonpatch.compare(existing, updated);
        logger.silly(`types.full.dao identifyChangedRelations: diff: ${JSON.stringify(diff)}`);

        // based on the changes, build up the relation changes query
        const toRemove = new TypeRelationsModel();
        toRemove.in = {};
        toRemove.out = {};
        const toAdd = new TypeRelationsModel();
        toAdd.in = {};
        toAdd.out = {};
        const processed4Levels: string[] = [];
        diff.forEach((d) => {
            const p = d.path.split('/');

            if (p.length === 2) {
                //////////////////// entire in/out
                if (d.op === 'remove') {
                    if (p[1] === 'in') {
                        for (const key of Object.keys(existing.in)) {
                            toRemove.in[key] = existing['in'][key];
                        }
                    } else if (p[1] === 'out') {
                        for (const key of Object.keys(existing.out)) {
                            toRemove.out[key] = existing['out'][key];
                        }
                    }
                } else if (d.op === 'add') {
                    if (p[1] === 'in') {
                        for (const key of Object.keys(updated.in)) {
                            toAdd.in[key] = updated['in'][key];
                        }
                    } else if (p[1] === 'out') {
                        for (const key of Object.keys(updated.out)) {
                            toAdd.out[key] = updated['out'][key];
                        }
                    }
                } else {
                    logger.warn(
                        `types.full.dao identifyChangedRelations: Unsupported diff op: ${JSON.stringify(
                            d,
                        )}`,
                    );
                }
            } else if (p.length === 3) {
                //////////////////// specific relation changed
                if (d.op === 'remove') {
                    if (p[1] === 'in') {
                        toRemove.in[p[2]] = existing['in'][p[2]];
                    } else if (p[1] === 'out') {
                        toRemove.out[p[2]] = existing['out'][p[2]];
                    }
                } else if (d.op === 'add') {
                    if (p[1] === 'in') {
                        toAdd.in[p[2]] = updated['in'][p[2]];
                    } else if (p[1] === 'out') {
                        toAdd.out[p[2]] = updated['out'][p[2]];
                    }
                } else {
                    logger.warn(
                        `types.full.dao identifyChangedRelations: Unsupported diff op: ${JSON.stringify(
                            d,
                        )}`,
                    );
                }
            } else if (p.length === 4) {
                //////////////////// a target type of a relation has changed

                // the diff output isn't great to work with for array diffs, therefore calculate the diff ourselves
                if (processed4Levels.indexOf(`${p[1]}/${p[2]}`) < 0) {
                    processed4Levels.push(`${p[1]}/${p[2]}`);

                    const existingTypes =
                        p[1] === 'in' ? existing['in'][p[2]] : existing['out'][p[2]];
                    const updatedTypes =
                        p[1] === 'in' ? updated['in'][p[2]] : updated['out'][p[2]];

                    // first find removed
                    const findDifferences = (
                        sourceArray: RelationTarget[],
                        targetArray: RelationTarget[],
                        differences: TypeRelationsModel,
                    ) => {
                        sourceArray.forEach((source) => {
                            const sourceIsExpanded = isRelationTargetExpanded(source);
                            const indexOf = (target: RelationTarget) => {
                                const targetIsExpanded = isRelationTargetExpanded(target);
                                if (sourceIsExpanded !== targetIsExpanded) {
                                    return false;
                                }
                                if (sourceIsExpanded) {
                                    return (
                                        (source as RelationTargetExpanded).name ===
                                        (target as RelationTargetExpanded).name
                                    );
                                } else {
                                    return source === target;
                                }
                            };
                            if (targetArray.findIndex(indexOf) < 0) {
                                if (p[1] === 'in') {
                                    if (differences.in[p[2]] === undefined) {
                                        differences.in[p[2]] = [];
                                    }
                                    differences.in[p[2]].push(source);
                                } else {
                                    if (differences.out[p[2]] === undefined) {
                                        differences.out[p[2]] = [];
                                    }
                                    differences.out[p[2]].push(source);
                                }
                            }
                        });
                    };
                    if (existingTypes) {
                        findDifferences(existingTypes, updatedTypes, toRemove);
                    }

                    // then find added
                    if (updatedTypes) {
                        findDifferences(updatedTypes, existingTypes, toAdd);
                    }
                }
            } else {
                logger.warn(
                    `types.full.dao identifyChangedRelations: Unsupported diff op: ${JSON.stringify(
                        d,
                    )}`,
                );
            }
        });

        const response = {
            add: toAdd,
            remove: toRemove,
        };

        logger.debug(`types.full.dao identifyChangedRelations: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async createDraft(model: TypeModel): Promise<void> {
        logger.debug(`types.full.dao createDraft: in: model: ${JSON.stringify(model)}`);

        const id = `type___${model.templateId}`;

        // create the new draft type
        const draftVersion = model.schema.version;
        const defId = `${id}___v${draftVersion}`;

        let result;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal
                .V(id)
                .as('type')
                .addV('typeDefinition')
                .property(process.t.id, defId)
                .property(process.cardinality.single, 'version', draftVersion)
                .property(
                    process.cardinality.single,
                    'definition',
                    JSON.stringify(model.schema.definition),
                )
                .property(process.cardinality.single, 'lastUpdated', new Date().toISOString())
                .as('definition')
                .addE('current_definition')
                .property('status', 'draft')
                .from_('type');

            this.addCreateRelationStepsToTraversal(
                model.schema.relations,
                model.templateId,
                traverser,
            );

            result = await traverser.next();
        } finally {
            await conn.close();
        }

        logger.debug(`types.full.dao createDraft: result: ${JSON.stringify(result)}`);

        if (result === undefined || result.value === null) {
            logger.debug(`types.full.dao createDraft: exit: result: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao createDraft: exit:`);
    }

    public async publish(templateId: string, category: TypeCategory): Promise<void> {
        logger.debug(`types.full.dao publish: in: templateId:${templateId}, category:${category}`);

        const id = `type___${templateId}`;
        const now = new Date().toISOString();

        // do we have an existing draft verison?
        const draft = await this.get(templateId, category, TypeDefinitionStatus.draft);
        if (draft === undefined) {
            throw new TemplateNotFoundError(`${templateId} (draft)`);
        }

        // do we have an existing published verison?
        const published = await this.get(templateId, category, TypeDefinitionStatus.published);

        // if we don't have a published version (new type), we just need to change the current_definition status
        let query: { value: process.Traverser | process.TraverserValue; done: boolean };
        const conn = super.getConnection();
        try {
            if (published === undefined) {
                query = await conn.traversal
                    // 1st get a handle on all the vertices/edges that we need to update
                    .V(id)
                    // upgrade the draft edge to published
                    .outE('current_definition')
                    .has('status', TypeDefinitionStatus.draft)
                    .property('status', 'published')
                    .property('from', now)
                    .next();
            } else {
                query = await conn.traversal
                    // 1st get a handle on all the vertices/edges that we need to update
                    .V(id)
                    .as('type')
                    .select('type')
                    .outE('current_definition')
                    .has('status', TypeDefinitionStatus.published)
                    .as('published_edge')
                    .inV()
                    .as('published')
                    .select('type')
                    .outE('current_definition')
                    .has('status', TypeDefinitionStatus.draft)
                    .as('draft_edge')
                    // create a expired_definition edge to identify the previously published definition as expired
                    .addE('expired_definition')
                    .property('from', __.select('published_edge').values('from'))
                    .property('to', now)
                    .from_('type')
                    .to('published')
                    // upgrade the draft edge to published
                    .select('draft_edge')
                    .property('status', TypeDefinitionStatus.published)
                    .property('from', now)
                    // remove the old published edge
                    .select('published_edge')
                    .drop()
                    .select('type', 'draft_edge')
                    .next();
            }
        } finally {
            await conn.close();
        }

        if (query === undefined) {
            logger.debug(`types.full.dao publish: exit: query: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao update: exit:`);
    }

    public async delete(templateId: string): Promise<void> {
        logger.debug(`types.full.dao delete: in: templateId:${templateId}`);

        const dbId = `type___${templateId}`;

        const conn = super.getConnection();
        try {
            const g = conn.traversal;

            await g
                .V(dbId)
                .out()
                .hasLabel('typeDefinition')
                .as('typeDefinitions')
                .drop()
                .iterate();

            await g.V(dbId).drop().iterate();
        } finally {
            await conn.close();
        }

        logger.debug(`types.full.dao delete: exit`);
    }

    public async validateRelationshipsByType(
        templateId: string,
        relations: DirectionToStringArrayMap,
    ): Promise<boolean> {
        logger.debug(
            `types.full.dao validateRelationshipsByType: in: templateId:${templateId}, relations:${JSON.stringify(
                relations,
            )}`,
        );

        const id = `type___${templateId}`;

        const conn = super.getConnection();
        let result;
        try {
            const traverser = conn.traversal
                .V(id)
                .outE('current_definition')
                .has('status', 'published')
                .inV()
                .as('def');

            if (relations?.in) {
                Object.entries(relations.in).forEach(([relation, templates]) => {
                    templates.forEach((template) => {
                        traverser
                            .select('def')
                            .bothE('relationship')
                            .has('name', relation)
                            .has('fromTemplate', template);
                    });
                });
            }
            if (relations?.out) {
                Object.entries(relations.out).forEach(([relation, templates]) => {
                    templates.forEach((template) => {
                        traverser
                            .select('def')
                            .bothE('relationship')
                            .has('name', relation)
                            .has('toTemplate', template);
                    });
                });
            }

            result = await traverser.next();
        } finally {
            await conn.close();
        }

        const isValid = result?.value !== undefined;
        logger.debug(`types.full.dao validateRelationshipsByType: exit: ${isValid}`);
        return isValid;
    }

    public async validateLinkedTypesExist(types: string[]): Promise<boolean> {
        logger.debug(`types.full.dao validateLinkedTypesExist: in: types:${types}`);

        if (types === null || types.length === 0) {
            logger.debug(`types.dao validateLinkedTypesExist: exit: true (no types)`);
            return true;
        }

        const typesAsLower = types.map((t) => `type___${t.toLowerCase()}`);

        const conn = super.getConnection();
        try {
            const count = await conn.traversal
                .V(...typesAsLower)
                .count()
                .next();

            const isValid = count.value === types.length;
            logger.debug(`types.full.dao validateLinkedTypesExist: exit: ${isValid}`);
            return isValid;
        } catch (err) {
            logger.error(JSON.stringify(err));
            await conn.close();
        }

        return true;
    }

    public async countInUse(templateId: string): Promise<number> {
        logger.debug(`types.full.dao countInUse: in: templateId:${templateId}`);

        let result;
        const conn = super.getConnection();
        try {
            result = await conn.traversal.V().hasLabel(templateId).count().next();
        } finally {
            await conn.close();
        }

        logger.debug(`types.full.dao countInUse: exit: ${JSON.stringify(result)}`);

        if (result === undefined || result.value === undefined) {
            return 0;
        }

        return result.value as number;
    }

    private toModel(
        result: process.Traverser,
        status: TypeDefinitionStatus,
        category: TypeCategory,
    ): TypeModel {
        logger.debug(`types.full.dao toModel: in: result: ${JSON.stringify(result)}`);

        const json = JSON.parse(JSON.stringify(result));

        const buildTarget = (template: string, includeInAuth: boolean): RelationTarget => {
            if (includeInAuth === undefined) {
                return template;
            } else {
                return {
                    name: template,
                    includeInAuth: includeInAuth,
                };
            }
        };

        const definitionJson = json['definition'];
        if (definitionJson !== undefined && (<unknown[]>definitionJson).length > 0) {
            const templateId = json['type']['templateId'][0];

            const definition: TypeVersionModel = {
                status,
                version: definitionJson[0]['version'][0],
                definition: JSON.parse(definitionJson[0]['definition'][0]),
            };

            const relationsJson = json['relations'];
            if (relationsJson !== undefined) {
                const relations = new TypeRelationsModel();
                for (const entry of relationsJson) {
                    const outTemplate = entry['fromTemplate'];
                    const inTemplate = entry['toTemplate'];
                    const relationship = entry['name'];
                    const includeInAuth = entry['includeInAuth'];

                    const direction = templateId === outTemplate ? 'out' : 'in';

                    if (outTemplate === inTemplate) {
                        // self link
                        if (relations.outgoingIncludes(relationship, inTemplate)) {
                            relations.addIncoming(
                                relationship,
                                buildTarget(outTemplate, includeInAuth),
                            );
                        } else {
                            relations.addOutgoing(
                                relationship,
                                buildTarget(inTemplate, includeInAuth),
                            );
                        }
                    } else if (direction === 'out') {
                        // outgoing link
                        relations.addOutgoing(
                            relationship,
                            buildTarget(inTemplate, includeInAuth),
                        );
                    } else {
                        // incoming link
                        relations.addIncoming(
                            relationship,
                            buildTarget(outTemplate, includeInAuth),
                        );
                    }
                }
                definition.relations = relations;
            }

            const model: TypeModel = {
                templateId,
                category,
                schema: definition,
            };

            logger.debug(`types.full.dao toModel: exit: model: ${JSON.stringify(model)}`);
            return model;
        } else {
            logger.debug(`types.full.dao toModel: exit: type status not found`);
            return undefined;
        }
    }
}

interface ChangedRelations {
    remove: TypeRelationsModel;
    add: TypeRelationsModel;
}

export interface RelationsByPath {
    groupTypesIn: GroupType[];
    groupTypesOut: GroupType[];
    deviceTypesIn: DeviceType[];
    deviceTypesOut: DeviceType[];
    rels: AllowedRelation[];
    invalidGroups: string[];
}

interface AllowedRelation {
    name: string;
    outType: string;
    inType: string;
}

export interface GroupType {
    path: string;
    template: string;
}

export interface DeviceType {
    id: string;
    template: string;
}
