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

import { StringArrayMap } from '../data/model';
import { logger } from '../utils/logger';
import { TypeCategory } from './constants';

export interface TypeModel {
    templateId: string;
    category: TypeCategory;
	schema: TypeVersionModel;
}

export interface TypeVersionModel {
	version?: number;
    definition: TypeDefinitionModel;
    status?: TypeDefinitionStatus;
    relations?: TypeRelationsModel;
}

export interface TypeDefinitionModel {
	properties?: {
        [key: string]: {
            type: string[]
        }
    };
    required?: string[];
    relations?: TypeRelationsModel;
    components?: string[];
    componentTypes?: TypeModel[];
}

export type RelationTargetSimple = string;
export type RelationTargetExpanded = {
    name: string,
    includeInAuth?:boolean,
};
export type RelationTarget = RelationTargetSimple | RelationTargetExpanded;

export function isRelationTargetExpanded(toBeDetermined: unknown) : toBeDetermined is RelationTargetExpanded {
	const asRelationTargetExpanded = toBeDetermined as RelationTargetExpanded;
	if (asRelationTargetExpanded?.name) {
		return true;
	}
	return false;
}

export class TypeRelationsModel {
	out?: { [key: string]: RelationTarget[] };
    in?: { [key: string]: RelationTarget[] };

    public outgoingIncludes(rel:string,targetName:string ) : boolean {
        if (this.out?.[rel]===undefined) {
            return false;
        }
        const targets = this.out[rel];
        let found = false;
        targets.forEach(t=> {
            if (isRelationTargetExpanded(t)) {
                found = found || ((t as RelationTargetExpanded).name===targetName);
            } else {
                found = found || ((t as RelationTargetSimple)===targetName);
            }
        });
        return found;
    }

    public incomingIncludes(rel:string,targetName:string ) : boolean {
        if (this.in?.[rel]===undefined) {
            return false;
        }
        const targets = this.in[rel];
        let found = false;
        targets.forEach(t=> {
            if (isRelationTargetExpanded(t)) {
                found = found || ((t as RelationTargetExpanded).name===targetName);
            } else {
                found = found || ((t as RelationTargetSimple)===targetName);
            }
        });
        return found;
    }

    public addOutgoing(rel:string, target:RelationTarget): void {
        if (this.out===undefined) {
            this.out= {};
        }
        if (this.out[rel]===undefined) {
            this.out[rel]= [];
        }
        this.out[rel].push(target);
    }

    public addIncoming(rel:string, target:RelationTarget): void {
        if (this.in===undefined) {
            this.in= {};
        }
        if (this.in[rel]===undefined) {
            this.in[rel]= [];
        }
        this.in[rel].push(target);
    }

    public outgoingAuthRelations() :StringArrayMap {
        logger.silly(`types.models outgoingAuthRelations: in:`);
        const result:StringArrayMap  = {};
        logger.silly(`types.models outgoingAuthRelations: this.in: ${JSON.stringify(this.out)}`);
        if (this.out===undefined) {
            return result;
        }
        for(const [relation,targets] of Object.entries(this.out)) {
            for (const target of targets) {
                if (isRelationTargetExpanded(target)) {
                    if ((target as RelationTargetExpanded).includeInAuth) {
                        if (result[relation]===undefined) {
                            result[relation]= [];
                        }
                        result[relation].push((target as RelationTargetExpanded).name);
                    }
                }
            }
        }
        logger.silly(`types.models outgoingAuthRelations: result: ${JSON.stringify(result)}`);
        return result;
    }

    public incomingAuthRelations() : StringArrayMap {
        logger.silly(`types.models incomingAuthRelations: in:`);
        const result:StringArrayMap  = {};
        logger.silly(`types.models incomingAuthRelations: this.in: ${JSON.stringify(this.in)}`);
        if (this.in===undefined) {
            return result;
        }
        for(const [relation,targets] of Object.entries(this.in)) {
            for (const target of targets) {
                if (isRelationTargetExpanded(target)) {
                    if ((target as RelationTargetExpanded).includeInAuth) {
                        if (result[relation]===undefined) {
                            result[relation]= [];
                        }
                        result[relation].push((target as RelationTargetExpanded).name);
                    }
                }
            }
        }
        logger.silly(`types.models incomingAuthRelations: result: ${JSON.stringify(result)}`);
        return result;
    }
}

export interface TypeResource extends TypeDefinitionModel {
    templateId: string;
    category: TypeCategory;
}

export interface TypeResourceList {
    results: TypeResource[];
    pagination?: {
        offset:number;
        count:number;
    };
}

export enum TypeDefinitionStatus {
    draft='draft',
    published='published',
    deprecated='deprecated'
}

export interface TemplateDefinitionJson {
    properties?: {
        [key: string]: {
            type: string | string[]
        }
    },
    required:string[],
    definitions: {
        subType: {
            type: string,
            properties?: {
                [key: string]: {
                    type: string | string[]
                }
            },
            required?: string[],
            additionalProperties: boolean
        },
        componentTypes: {
            type: string,
            items: {
                anyOf: TemplateDefinitionJson[]
            }
        }
    }
}
