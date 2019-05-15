/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import { TYPES } from '../di/types';
import {TypeModel, TypeVersionModel, TypeRelationsModel } from './types.models';
import * as jsonpatch from 'fast-json-patch';
import { TypeCategory } from './constants';

const __ = process.statics;

@injectable()
export class TypesDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async get(templateId: string, category: TypeCategory, status: string): Promise<TypeModel> {
        logger.debug(`types.full.dao get: in: templateId: ${templateId}, category: ${category}, status: ${status}`);

        const dbId = `type___${templateId}`;

        const traverser = this._g.V(dbId).as('a');

        if (category!==undefined) {
            const superId = `type___${category}`;
            traverser.out('super_type').has(process.t.id, superId);
        }

        traverser.
            select('a').outE('current_definition').has('status',status).inV().as('def').
            project('type','definition','relations').
                by(__.select('a').valueMap(true)).
                by(__.select('def').valueMap(true).fold()).
                by(__.bothE('relationship').valueMap(true).fold());

        const query = await traverser.toList();

        logger.debug(`types.full.dao get: traverser: ${traverser.toString()}`);
        logger.debug(`types.full.dao get: query: ${JSON.stringify(query)}`);

        if (query===undefined || query.length===0) {
            logger.debug(`types.full.dao get: exit: query: undefined`);
            return undefined;
        }

        const model = this.toModel(query[0], status, category);
        logger.debug(`types.full.dao get: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    public async list(category:TypeCategory, status:string, offset:number, count:number): Promise<TypeModel[]> {
        logger.debug(`types.full.dao list: in: category:${category}, status:${status}, offset:${offset}, count:${count}`);

        const superId = `type___${category}`;

        const traverser = this._g.V(superId).
            inE('super_type').outV().as('a').
            outE('current_definition').has('status',status).inV().as('def').
            project('type','definition','relations').
                by(__.select('a').valueMap(true)).
                by(__.select('def').valueMap(true).fold()).
                by(__.bothE('relationship').valueMap(true).fold());

        // apply pagination
        if (offset!==undefined && count!==undefined) {
            // note: workaround for wierd typescript issue. even though offset/count are declared as numbers
            // througout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);
            traverser.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        const results = await traverser.toList();

        logger.debug(`types.full.dao get: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`types.full.dao list: exit: results: undefined`);
            return undefined;
        }

        const r:TypeModel[]=[];
        for(const result of results) {
            r.push( this.toModel(result, status, category));
        }

        logger.debug(`types.full.dao list: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

    public async create(model: TypeModel): Promise<void> {
        logger.debug(`types.full.dao create: in: model: ${JSON.stringify(model)}`);

        const superId = `type___${model.category}`;
        const id = `type___${model.templateId}`;
        const defId = `${id}___v${model.schema.version}`;

        const traverser = this._g.V(superId).as('superType').
            addV('type').
                property(process.t.id, id).
                property(process.cardinality.single, 'templateId', model.templateId).
                as('type').
            addV('typeDefinition').
                property(process.t.id, defId).
                property(process.cardinality.single, 'version', model.schema.version).
                property(process.cardinality.single, 'definition', JSON.stringify(model.schema.definition)).
                property(process.cardinality.single, 'lastUpdated', new Date().toISOString()).
                as('definition').
            addE('current_definition').
                property('status','draft').
                from_('type').to('definition').
            addE('super_type').
                from_('type').to('superType');

        this.addCreateRelationStepsToTraversal(model.schema.relations, model.templateId, traverser);

        logger.debug(`types.full.dao create: traverser: ${JSON.stringify(traverser.toString())}`);
        const query = await traverser.next();

        logger.debug(`types.full.dao create: query: ${JSON.stringify(query)}`);

        if (query===undefined) {
            logger.debug(`types.full.dao create: exit: query: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao create: exit:`);
    }

    private addCreateRelationStepsToTraversal(rels:TypeRelationsModel, templateId:string, traverser:process.GraphTraversal) {
        if (rels && rels.out) {
            for (const key of Object.keys(rels.out)) {
                rels.out[key]=rels.out[key].sort();
                for (const outTemplate of rels.out[key]) {
                    this.addCreateOutboundRelationStepToTraversal(templateId.toLowerCase(), outTemplate.toLowerCase(), key.toLowerCase(), traverser);
                }
            }
        }

        if (rels && rels.in) {
            for (const key of Object.keys(rels.in)) {
                rels.in[key]=rels.in[key].sort();
                for (const inTemplate of rels.in[key]) {
                    this.addCreateInboundRelationStepToTraversal(templateId.toLowerCase(), inTemplate.toLowerCase(), key.toLowerCase(), traverser);
                }
            }
        }
    }

    private addCreateOutboundRelationStepToTraversal(templateId:string, outTemplate:string, relation:string, traverser:process.GraphTraversal) {
        logger.debug(`types.full.dao addCreateOutboundRelationStepToTraversal: in: templateId:${templateId}, outTemplate:${outTemplate}, relation:${relation}`);
        traverser.V(`type___${outTemplate}`).outE('current_definition').has('status','published').inV().as(`rel_out_${outTemplate}`).
            addE('relationship').
                property('name', relation).
                property('fromTemplate', templateId).
                property('toTemplate', outTemplate).
                from_('definition').to(`rel_out_${outTemplate}`);
    }

    private addCreateInboundRelationStepToTraversal(templateId:string, inTemplate:string, relation:string, traverser:process.GraphTraversal) {
        logger.debug(`types.full.dao addCreateInboundRelationStepToTraversal: in: templateId:${templateId}, inTemplate:${inTemplate}, relation:${relation}`);
        traverser.V(`type___${inTemplate}`).outE('current_definition').has('status','published').inV().as(`rel_in_${inTemplate}`).
            addE('relationship').
                property('name', relation).
                property('fromTemplate', inTemplate).
                property('toTemplate', templateId).
                from_(`rel_in_${inTemplate}`).to('definition');
    }

    public async updateDraft(existing: TypeModel, updated: TypeModel): Promise<void> {
        logger.debug(`types.full.dao updateDraft: in: existing: ${JSON.stringify(existing)}, updated: ${JSON.stringify(updated)}`);

        const id = `type___${existing.templateId}`;

        const traverser = this._g.V(id).
            outE('current_definition').has('status','draft').inV().as('definition').
                property(process.cardinality.single, 'definition', JSON.stringify(updated.schema.definition)).
                property(process.cardinality.single, 'lastUpdated', new Date().toISOString());

        if (updated.schema.relations) {
            const changedRelations = this.identifyChangedRelations(existing.schema.relations, updated.schema.relations);
            logger.debug(`changedRelations: ${JSON.stringify(changedRelations)}`);

            Object.keys(changedRelations.add.in).forEach(key=> {
                changedRelations.add.in[key].forEach(value=> {
                    this.addCreateInboundRelationStepToTraversal(existing.templateId, value, key, traverser);
                });
            });

            Object.keys(changedRelations.add.out).forEach(key=> {
                changedRelations.add.out[key].forEach(value=> {
                    this.addCreateOutboundRelationStepToTraversal(existing.templateId, value, key, traverser);
                });
            });

            const removedRelations: process.GraphTraversal[]= [];

            Object.keys(changedRelations.remove.in).forEach(key=> {
                changedRelations.remove.in[key].forEach(value=> {
                    removedRelations.push(__.select('definition').inE('relationship').has('name',key).has('fromTemplate',value));
                });
            });

            Object.keys(changedRelations.remove.out).forEach(key=> {
                changedRelations.remove.out[key].forEach(value=> {
                    removedRelations.push(__.select('definition').outE('relationship').has('name',key).has('toTemplate',value));
                });
            });

            if (removedRelations.length>0) {
                traverser.select('definition').
                    local(
                        __.union(...removedRelations)
                    ).drop();
            }
        }

        const result = await traverser.next();

        logger.debug(`types.full.dao updateDraft: result: ${JSON.stringify(result)}`);

        if (result===undefined || result.value===null) {
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
    public __private___identifyChangedRelations(existing:TypeRelationsModel, updated:TypeRelationsModel): ChangedRelations {
        return this.identifyChangedRelations(existing, updated);
    }

    private identifyChangedRelations(existing:TypeRelationsModel, updated:TypeRelationsModel): ChangedRelations  {
        // before we diff, sort the relations.  this avoids reporting any unneccessary modifications where just the ordering may have changed
        if (existing && existing.in) {
            for (const key of Object.keys(existing.in)) {
                existing.in[key]=existing.in[key].sort();
            }
        }
        if (existing && existing.out) {
            for (const key of Object.keys(existing.out)) {
                existing.out[key]=existing.out[key].sort();
            }
        }
        if (updated && updated.in) {
            for (const key of Object.keys(updated.in)) {
                updated.in[key]=updated.in[key].sort();
            }
        }
        if (updated && updated.out) {
            for (const key of Object.keys(updated.out)) {
                updated.out[key]=updated.out[key].sort();
            }
        }

        // perform a diff of the relations so we can determine what specifically to add and remove
        const diff = jsonpatch.compare(existing, updated);

        // based on the changes, build up the relation changes query
        const toRemove = new TypeRelationsModel();
        toRemove.in = {};
        toRemove.out = {};
        const toAdd = new TypeRelationsModel();
        toAdd.in = {};
        toAdd.out = {};
        const processed4Levels:string[]=[];
        diff.forEach(d=> {
            const p = d.path.split('/');

            if (p.length===2) {     //////////////////// entire in/out
                if (d.op==='remove') {
                    if (p[1]==='in') {
                        for (const key of Object.keys(existing.in)) {
                            toRemove.in[key] = existing['in'][key];
                        }
                    } else if (p[1]==='out') {
                        for (const key of Object.keys(existing.out)) {
                            toRemove.out[key] = existing['out'][key];
                        }
                    }
                } else if (d.op==='add') {
                    if (p[1]==='in') {
                        for (const key of Object.keys(updated.in)) {
                            toAdd.in[key] = updated['in'][key];
                        }
                    } else if (p[1]==='out') {
                        for (const key of Object.keys(updated.out)) {
                            toAdd.out[key] = updated['out'][key];
                        }
                    }
                } else {
                    logger.warn(`types.full.dao Unsupported diff op: ${JSON.stringify(d)}`);
                }

            } else if (p.length===3) {     //////////////////// specific relation changed
                if (d.op==='remove') {
                    if (p[1]==='in') {
                        toRemove.in[p[2]] = existing['in'][p[2]];
                    } else if (p[1]==='out') {
                        toRemove.out[p[2]] = existing['out'][p[2]];
                    }
                } else if (d.op==='add') {
                    if (p[1]==='in') {
                        toAdd.in[p[2]] = updated['in'][p[2]];
                    } else if (p[1]==='out') {
                        toAdd.out[p[2]] = updated['out'][p[2]];
                    }
                } else {
                    logger.warn(`types.full.dao Unsupported diff op: ${JSON.stringify(d)}`);
                }

            } else if (p.length===4) {     //////////////////// a target type of a relation has changed

                // the diff output isnt great to work with for array diffs, therefore calculate the diff ourselves
                if (processed4Levels.indexOf(`${p[1]}/${p[2]}`)<0) {

                    processed4Levels.push(`${p[1]}/${p[2]}`);

                    const existingTypes = (p[1]==='in') ? existing['in'][p[2]] : existing['out'][p[2]];
                    const updatedTypes = (p[1]==='in') ? updated['in'][p[2]] : updated['out'][p[2]];

                    // first find removed
                    if (existingTypes) {
                        existingTypes.forEach(t=> {
                            if (updatedTypes.indexOf(t)<0) {
                                if (p[1]==='in') {
                                    if (toRemove.in[p[2]]===undefined) {
                                        toRemove.in[p[2]]=[];
                                    }
                                    toRemove.in[p[2]].push(t);
                                } else {
                                    if (toRemove.out[p[2]]===undefined) {
                                        toRemove.out[p[2]]=[];
                                    }
                                    toRemove.out[p[2]].push(t);
                                }
                            }
                        });
                    }

                    // then find added
                    if (updatedTypes) {
                        updatedTypes.forEach(t=> {
                            if (existingTypes.indexOf(t)<0) {
                                if (p[1]==='in') {
                                    if (toAdd.in[p[2]]===undefined) {
                                        toAdd.in[p[2]]=[];
                                    }
                                    toAdd.in[p[2]].push(t);
                                } else {
                                    if (toAdd.out[p[2]]===undefined) {
                                        toAdd.out[p[2]]=[];
                                    }
                                    toAdd.out[p[2]].push(t);
                                }
                            }
                        });
                    }
                }

            } else {
                logger.warn(`types.full.dao Unsupported diff op: ${JSON.stringify(d)}`);
            }
        });

        return {
            add: toAdd,
            remove: toRemove
        };
    }

    public async createDraft(model: TypeModel): Promise<void> {
        logger.debug(`types.full.dao createDraft: in: model: ${JSON.stringify(model)}`);

        const id = `type___${model.templateId}`;

        // create the new draft type
        const draftVersion = model.schema.version;
        const defId = `${id}___v${draftVersion}`;
        const traverser = this._g.V(id).as('type').
            addV('typeDefinition').
                property(process.t.id, defId).
                property(process.cardinality.single, 'version', draftVersion).
                property(process.cardinality.single, 'definition', JSON.stringify(model.schema.definition)).
                property(process.cardinality.single, 'lastUpdated', new Date().toISOString()).
                as('definition').
            addE('current_definition').
                property('status','draft').
                from_('type');

        this.addCreateRelationStepsToTraversal(model.schema.relations, model.templateId, traverser);

        const result = await traverser.next();

        logger.debug(`types.full.dao createDraft: result: ${JSON.stringify(result)}`);

        if (result===undefined || result.value===null) {
            logger.debug(`types.full.dao createDraft: exit: result: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao createDraft: exit:`);

    }

    public async publish(templateId:string, category:TypeCategory): Promise<void> {
        logger.debug(`types.full.dao publish: in: templateId:${templateId}, category:${category}`);

        const id = `type___${templateId}`;
        const now = new Date().toISOString();

        // do we have an existing draft verison?
        const draft = await this.get(templateId, category, 'draft');
        if (draft===undefined) {
            throw new Error('NOT_FOUND');
        }

        // do we have an existing published verison?
        const published = await this.get(templateId, category, 'published');

        // if we don't have a published version (new type), we just need to change the current_definition status
        let query: {value:process.Traverser|process.TraverserValue, done:boolean};
        if (published===undefined) {
            query = await this._g.
                // 1st get a handle on all the vertices/edges that we need to update
                V(id).
                // upgrade the draft edge to published
                outE('current_definition').has('status','draft').
                    property('status','published').
                    property('from', now).
                next();

        } else {

            query = await this._g.
            // 1st get a handle on all the vertices/edges that we need to update
            V(id).as('type').
            select('type').outE('current_definition').has('status','published').as('published_edge').
            inV().as('published').
            select('type').outE('current_definition').has('status','draft').as('draft_edge').
            // create a expired_definition edge to identify the previously published definition as expired
            addE('expired_definition').
                property('from', __.select('published_edge').values('from')).
                property('to', now).
                from_('type').to('published').
            // upgrade the draft edge to published
            select('draft_edge').
                property('status','published').
                property('from', now).
            // remove the old published edge
            select('published_edge').
                drop().
            select('type','draft_edge').
               next();
        }

        if (query===undefined) {
            logger.debug(`types.full.dao publish: exit: query: undefined`);
            return undefined;
        }
        logger.debug(`types.full.dao update: exit:`);

    }

    public async delete(templateId: string): Promise<void> {
        logger.debug(`types.full.dao delete: in: templateId:${templateId}`);

        const dbId = `type___${templateId}`;

        await this._g.V(dbId).
            out().hasLabel('typeDefinition').as('typeDefinitions').drop().iterate();

        await this._g.V(dbId).drop().iterate();

        logger.debug(`types.full.dao delete: exit`);
    }

    public async validateRelationshipsByType(templateId:string, out:{ [key: string] : string[]}): Promise<boolean> {
        logger.debug(`types.full.dao validateRelationshipsByType: in: templateId:${templateId}, out:${out}`);

        const id = `type___${templateId}`;

        const traverser = this._g.V(id).
            outE('current_definition').has('status','published').inV().as('def');

        Object.keys(out).forEach(key=> {
            const values = out[key];
            values.forEach(value=> {
                traverser.select('def').outE('relationship').
                    has('name',key).
                    has('toTemplate',value);
            });
        });

        const query = await traverser.next();

        const isValid = (query!==undefined && query.value!==undefined);
        logger.debug(`types.full.dao validateRelationshipsByType: exit: ${isValid}`);
        return isValid;

    }

    public async validateRelationshipsByPath(templateId:string, out:{ [key: string] : string[]}): Promise<RelationsByPath> {
        logger.debug(`types.full.dao validateRelationshipsByPath: in: templateId:${templateId}, out:${JSON.stringify(out)}`);

        const id = `type___${templateId.toLowerCase()}`;

        // get a handle on the type
        const traverser = this._g.V(id).
            outE('current_definition').has('status','published').inV().as('def');

        // get all known allowed relationships
        traverser.select('def').outE('relationship').fold().as('rels');

        // get a handle to the groups that we're trying to associate with
        let index = 1;
        Object.keys(out).forEach(rel=> {
            out[rel].forEach(path=> {
                const alias = `g_${index}`;
                traverser.V(`group___${path.toLowerCase()}`).as(alias);
                index++;
            });
        });

        // we need to project all known groups, plus details of the allowed relationships
        const projections:string[]=[];
        index = 1;
        Object.keys(out).forEach(rel=> {
            out[rel].forEach(_path=> {
                projections.push(`g_${index}`);
                index++;
            });
        });
        projections.push('rels');
        projections.push('rels_props');
        traverser.project(...projections);

        // return the details of all the groups to match with the above projections
        index = 1;
        Object.keys(out).forEach(rel=> {
            out[rel].forEach(_path=> {
                traverser.by(__.select(`g_${index}`));
                index++;
            });
        });

        // also return details of the relations (the edge) along with the relations properties (its valuemap)
        traverser.by(__.select('rels'));
        traverser.by(__.select('rels').unfold().valueMap(true).fold());

        // execute the query
        const results = await traverser.next();

        // parse the results
        const groupTypes:GroupType[]=[];
        const rels:any[]=[];
        const rels_props:any[]=[];
        const validGroups:string[]=[];
        const allowed_rels:AllowedRelation[]=[];
        logger.debug(`types.full.dao validateRelationshipsByPath: results: ${JSON.stringify(results)}`);

        if (results!==undefined && results.value!==null) {
            const values = JSON.parse(JSON.stringify(results.value));
            Object.keys(values).forEach(k=> {
                if (k.startsWith('g_')) {
                    // this is a group that we have found based on the provided `out` parameter
                    const path = this.extractNameFromId( values[k].id);
                    validGroups.push(path);
                    (values[k].label.split('::') as string[]).
                        filter(l=> l!=='group' && l!=='device').
                        forEach(l=> groupTypes.push({path,template:l}));
                } else if (k==='rels') {
                    // this is an allowed relationship for the provided templateId
                    for(const r of values[k]) {
                        rels.push(r);
                    }
                } else if (k==='rels_props') {
                    // this is an allowed relationship (its properties) for the provided templateId
                    for(const r of values[k]) {
                        rels_props.push(r);
                    }
                }
            });
        }

        // format the allowed relations to make it easier to work with
        for(const r of rels) {
            const rel_props = rels_props.filter(rp=> rp.id===r.id)[0];
            allowed_rels.push({
               name:rel_props.name,
               outType:this.extractNameFromId(r.outV),
               inType:this.extractNameFromId(r.inV)
            });
        }

        // validate that all requested group paths were found
        const invalidGroups:string[]=[];
        Object.keys(out).forEach(rel=> {
            out[rel].forEach(path=> {
                if (!validGroups.includes(path.toLowerCase())) {
                    invalidGroups.push(path.toLowerCase());
                }
            });
        });

        const response = {
            groupTypes,
            rels: allowed_rels,
            invalidGroups
        };
        logger.debug(`types.full.dao validateRelationshipsByPath: exit: ${JSON.stringify(response)}`);
        return response;
    }

    private extractNameFromId(id:string):string {
        // given `type___test-devices-unlinkablegroup___v1`, return `type___test-devices-unlinkablegroup`
        return id.split('___')[1];
    }

    public async validateLinkedTypesExist(types:string[]): Promise<boolean> {
        logger.debug(`types.full.dao validateLinkedTypesExist: in: types:${types}`);

        if (types===null || types.length===0) {
            logger.debug(`types.dao validateLinkedTypesExist: exit: true (no types)`);
            return true;
        }

        const typesAsLower = types.map(t=> `type___${t.toLowerCase()}`);

        try {
            const count = await this._g.V(...typesAsLower).count().next();

            const isValid = (count.value===types.length);
            logger.debug(`types.full.dao validateLinkedTypesExist: exit: ${isValid}`);
            return isValid;
        } catch (err) {
            logger.error(JSON.stringify(err));
        }

        return true;
    }

    public async countInUse(templateId:string): Promise<number> {
        logger.debug(`types.full.dao countInUse: in: templateId:${templateId}`);

        const query = await this._g.V().hasLabel(templateId).count().next();

        logger.debug(`types.full.dao countInUse: exit: ${query.value}`);
        return query.value as number;

    }

    private toModel(result: process.Traverser, status:string, category:TypeCategory): TypeModel {
        logger.debug(`types.full.dao toModel: in: result: ${JSON.stringify(result)}`);

        const json = JSON.parse( JSON.stringify(result));

        const definitionJson = json['definition'];
        if (definitionJson!==undefined && (<object[]>definitionJson).length>0) {

            const templateId = json['type']['templateId'][0];

            const definition = new TypeVersionModel();
            definition.status = status;
            definition.version = definitionJson[0]['version'][0];
            definition.definition = JSON.parse(definitionJson[0]['definition'][0]);

            const relationsJson = json['relations'];
            if (relationsJson!==undefined) {
                const relations = new TypeRelationsModel();
                for(const entry of relationsJson) {
                    const outTemplate = entry['fromTemplate'];
                    const inTemplate = entry['toTemplate'];
                    const relationship = entry['name'];

                    const direction = (templateId===outTemplate) ? 'out' : 'in';
                    if (relations[direction]===undefined) {
                        relations[direction] = {};
                    }
                    if (relations[direction][relationship]===undefined) {
                        relations[direction][relationship]=[];
                    }
                    if (direction==='out') {
                        relations.out[relationship].push(inTemplate);
                    } else {
                        relations.in[relationship].push(outTemplate);
                    }
                }
                definition.relations=relations;
            }

            const model = new TypeModel();
            model.templateId = templateId;
            model.category = category;
            model.schema = definition;

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

interface RelationsByPath {
    groupTypes:GroupType[];
    rels:AllowedRelation[];
    invalidGroups:string[];
}

interface AllowedRelation {
    name:string;
    outType:string;
    inType:string;
}

interface GroupType {
    path:string;
    template:string;
}
