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

import { TypeCategory } from './constants';

export class TypeModel {
    templateId: string;
    category: TypeCategory;
	schema: TypeVersionModel;
}

export class TypeVersionModel {
	version: number;
    definition: TypeDefinitionModel;
    status: TypeDefinitionStatus;
    relations: TypeRelationsModel;
}

export class TypeDefinitionModel {
	properties?: {
        [key: string]: {
            type: string[]
        }
    };
	// properties?: { [key: string]: string|string[] };
    required?: string[];
    relations?: TypeRelationsModel;
    components?: string[];
}

export class TypeRelationsModel {
	out?: { [key: string]: string[] };
    in?: { [key: string]: string[] };

    public outgoingIncludes(rel:string,template:string ) : boolean {
        if (this.out===undefined) {
           return false;
        }
        if (this.out[rel]===undefined) {
            return false;
        }
        return this.out[rel].includes(template);
    }

    public incomingIncludes(rel:string,template:string ) : boolean {
        if (this.in===undefined) {
           return false;
        }
        if (this.in[rel]===undefined) {
            return false;
        }
        return this.in[rel].includes(template);
    }

    public addOutgoing(rel:string, template:string): void {
        if (this.out===undefined) {
            this.out= {};
        }
        if (this.out[rel]===undefined) {
            this.out[rel]= [];
        }
        this.out[rel].push(template);
    }

    public addIncoming(rel:string, template:string): void {
        if (this.in===undefined) {
            this.in= {};
        }
        if (this.in[rel]===undefined) {
            this.in[rel]= [];
        }
        this.in[rel].push(template);
    }
}

export class TypeResource extends TypeDefinitionModel {
    templateId: string;
    category: TypeCategory;
}

export class TypeResourceList {
    results: TypeResource[]=[];
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
