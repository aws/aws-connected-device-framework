const PK_DELIMITER = ':';

export function createDelimitedAttribute(type:PkType, ...items:(string|number|boolean)[]) {
    const escapedItems = items.map(i=> {
       if (typeof i === 'string') {
            return escape(i);
       } else {
        return i;
       }
    });
    return `${delimitedAttributePrefix(type)}${escapedItems.join(PK_DELIMITER)}`;
}

export function createDelimitedAttributePrefix(type:PkType, ...items:(string|number|boolean)[]) {
    return `${createDelimitedAttribute(type, ...items)}${PK_DELIMITER}`;
}

export function expandDelimitedAttribute(value:string) {
    if (value===undefined) {
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

export enum PkType {
    EventSource='ES',
    Event='E',
    Subscription='S',
    User='U'
}
