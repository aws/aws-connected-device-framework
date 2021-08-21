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
const PK_DELIMITER = ':';

export function createDelimitedAttribute(type:PkType, ...items:(string|number|boolean)[]) : string {
    const escapedItems = items.map(i=> {
       if (typeof i === 'string') {
            return escape(i);
       } else {
        return i;
       }
    });
    return  `${delimitedAttributePrefix(type)}${escapedItems.join(PK_DELIMITER)}`;
}

export function createDelimitedAttributePrefix(type:PkType, ...items:(string|number|boolean)[]) : string {
    return `${createDelimitedAttribute(type, ...items)}${PK_DELIMITER}`;
}

export function expandDelimitedAttribute(value:string) : string[] {
    if (value===null || value===undefined) {
        return undefined;
    }
    const expanded = value.split(PK_DELIMITER);
    return expanded.map(i=> {
        if (typeof i === 'string') {
             return unescape(i);
        } else {
         return i;
        }
     });
}

export function delimitedAttributePrefix(type:PkType) : string {
    return `${type}${PK_DELIMITER}`;
}

export function isPkType(value:string, type:PkType) : boolean {
    return value.startsWith(delimitedAttributePrefix(type));
}

export enum PkType {
    EventSource='ES',
    Event='E',
    Subscription='S',
    User='U',
    SubscriptionTarget='ST',
    Type='type'
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function extractValue(json:any): any {
    if (json.S!==undefined) {
        return json.S;
    } else if (json.N!==undefined) {
        return parseFloat(json.N);
    } else if (json.BOOL!==undefined) {
        return json.BOOL==='true';
    } else  if (json.SS!==undefined) {
        return <string[]>json.SS;
    } else if (json.NS!==undefined) {
        return <number[]>json.NS;
    } else if (json.L!==undefined) {
        const arr:string[]= [];
        for(const item of json.L) {
          arr.push(<string>extractValue(item));
        }
        return arr;
    } else if (json.M!==undefined) {
        const obj:{[key:string]: string|string[]|number|number[]|boolean}= {};
        for(const key of Object.keys(json.M)) {
          obj[key]= extractValue(json.M[key]);
        }
        return obj;
    } else {
        // not supported
        return undefined;
    }
  }
