/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
const PK_DELIMITER = ':';

export function createDelimitedAttribute(type:PkType, ...items:(string|number|boolean)[]) {
    const escapedItems = items.map(i=> {
       if (typeof i === 'string') {
            return escape(i);
       } else {
        return i;
       }
    });
    return  `${delimitedAttributePrefix(type)}${escapedItems.join(PK_DELIMITER)}`;
}

export function createDelimitedAttributePrefix(type:PkType, ...items:(string|number|boolean)[]) {
    return `${createDelimitedAttribute(type, ...items)}${PK_DELIMITER}`;
}

export function expandDelimitedAttribute(value:string) {
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

export function delimitedAttributePrefix(type:PkType) {
    return `${type}${PK_DELIMITER}`;
}

export function isPkType(value:string, type:PkType) {
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
        const obj:{[key:string]: string|number|boolean}= {};
        for(const key of Object.keys(json.M)) {
          obj[key]= extractValue(json.M[key]);
        }
        return obj;
    } else {
        // not supported
        return undefined;
    }
  }
