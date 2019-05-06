/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { ProfileNode } from './profiles.models';
import { AttributeValue } from '../data/node';
import { TypeCategory } from '../types/constants';

const __ = process.statics;

@injectable()
export class ProfilesDaoFull {

    private _g: process.GraphTraversalSource;

    public constructor(
	    @inject(TYPES.GraphTraversalSourceFactory) graphTraversalSourceFactory: () => process.GraphTraversalSource
    ) {
        this._g = graphTraversalSourceFactory();
    }

    public async create(n:ProfileNode): Promise<string> {
        logger.debug(`profiles.full.dao create: in: n:${JSON.stringify(n)}`);

        const profileId = `profile___${n.templateId}___${n.attributes['profileId']}`;
        const templateId = `type___${n.templateId}`;
        const labels = n.types.join('::');

        /*  create the profile  */
        const traversal = this._g.V(templateId).as('type').
            addV(labels).
                property(process.t.id, profileId);

        /*  set the profiles attributes  */
        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key]!==undefined) {
                traversal.property(process.cardinality.single, key, n.attributes[key]);
            }
        }

        /*  save any groups  */
        if (n.groups) {
            traversal.property(process.cardinality.single, 'groups', JSON.stringify(n.groups));
        }

        /*  link the profile to the type  */
        traversal.as('profile').
            addE('profiles').
                from_('profile').to('type');

        logger.debug(`profiles.full.dao create: traversal:${traversal}`);
        await traversal.iterate();

        logger.debug(`profiles.full.dao create: exit: id:${profileId}`);
        return profileId;

    }

    public async get(templateId:string, profileId:string): Promise<ProfileNode> {
        logger.debug(`profiles.full.dao get: in: templateId:${templateId}, profileId:${profileId}`);

        const id = `profile___${templateId}___${profileId}`;

        // assemble the main query
        const traverser = this._g.V(id).as('profile').
            out('profiles').as('template').
            out('super_type').as('category').
            project('profile','template','category').
                by(__.select('profile').valueMap(true)).
                by(__.select('template').valueMap(true)).
                by(__.select('category').valueMap(true));

        // execute and retrieve the resutls
        const result = await traverser.next();

        if (result===undefined || result.value===undefined || result.value===null) {
            logger.debug(`profiles.full.dao get: exit: node: undefined`);
            return undefined;
        }

        const r = JSON.parse(JSON.stringify(result.value));
        const node = this.assembleNode(r.profile, r.template, r.category);

        logger.debug(`profiles.full.dao get: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public async update(n: ProfileNode): Promise<string> {
        logger.debug(`profiles.full.dao update: in: n:${JSON.stringify(n)}`);

        const id = `profile___${n.templateId}___${n.attributes['profileId']}`;

        const traversal = this._g.V(id);

        for (const key of Object.keys(n.attributes)) {
            const val = n.attributes[key];
            if (val!==undefined) {
                if (val===null) {
                    traversal.properties(key).drop();
                } else {
                    traversal.property(process.cardinality.single, key, val);
                }
            }
        }

        await traversal.iterate();

        logger.debug(`profiles.full.dao update: exit: id:${id}`);
        return id;

    }

    private assembleNode(profile:{ [key:string]: AttributeValue}, template:{ [key:string]: AttributeValue},
        category:{ [key:string]: AttributeValue}) : ProfileNode {

        logger.debug(`profiles.full.dao assembleNode: in: profile:${JSON.stringify(profile)}, template:${JSON.stringify(template)}, category:${JSON.stringify(category)}`);

        const labels = (<string> profile['label']).split('::');
        const node = new ProfileNode();
        Object.keys(profile).forEach( key => {
            if (key==='id') {
                node.id = <string> profile[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = profile[key] ;
            }
        });

        node.templateId = <string> template['templateId'];
        node.category = (<string>category['id']).replace('type___','') as TypeCategory;

        logger.debug(`profiles.full.dao assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public async delete(templateId:string, profileId:string): Promise<void> {
        logger.debug(`profiles.full.dao delete: in: templateId:${templateId}, profileId:${profileId}`);

        const id = `profile___${templateId}___${profileId}`;

        await this._g.V(id).drop().iterate();

        logger.debug(`profiles.full.dao delete: exit`);
    }

    public async list(templateId:string): Promise<ProfileNode[]> {
        logger.debug(`profiles.full.dao list: in: templateId:${templateId}`);

        const id = `type___${templateId}`;

        const traverser = this._g.V(id).as('template').
            out('super_type').as('category').
            select('template').in_('profiles').as('profiles').
            project('profiles','template','category').
                by(__.select('profiles').valueMap(true).fold()).
                by(__.select('template').valueMap(true)).
                by(__.select('category').valueMap(true));

        const result = await traverser.next();

        logger.debug(`profiles.full.dao get: results: ${JSON.stringify(result)}`);

        if (result===undefined || result.value===undefined || result.value===null) {
            logger.debug(`profiles.full.dao list: exit: results: undefined`);
            return undefined;
        }
        const r = JSON.parse(JSON.stringify(result.value));

        const response:ProfileNode[]=[];
        for (const profile of r.profiles) {
            response.push( this.assembleNode(profile, r.template, r.category));
        }

        logger.debug(`profiles.full.dao list: exit: r: ${JSON.stringify(response)}`);
        return response;

    }

}
