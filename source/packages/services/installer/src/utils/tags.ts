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
import ow from 'ow';
import { Tag } from '../models/tags';

// For rules relating to tag keys and values, see
// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#tag-restrictions
// https://docs.aws.amazon.com/directoryservice/latest/devguide/API_Tag.html
//
// \p{L} and \p{N} and \p{Zs} are Unicode property escapes for letters, numbers and space separators, respectively:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes
// https://unicode.org/reports/tr18/#General_Category_Property
const tagKeyPattern = /^[\p{L}\p{N}+\-=._:@]{1,128}$/u;
const tagValuePattern = /^[\p{L}\p{N}\p{Zs}+\-=._:/@]{0,256}$/u;
// const kvRegex = /^([\p{L}\p{N}+\-=._:/@]{1,128})=([\p{L}\p{Zs}\p{N}+\-=._:@]{1,256})*$/u;
export function isValidTagKey(str: string): boolean {
    // The aws: prefix is reserved for AWS use.
    if (str.startsWith('aws:')) return false;
    // [EC2] Instance tag keys can't comprise only . (one period), .. (two periods), or _index.
    if (str === '.' || str === '..' || str === '_index') return false;
    if (!str.match(tagKeyPattern)) return false;
    return true;
}

export function isValidTagValue(str: string): boolean {
    // values starting with, ending with, or consisting of only whitespace are discouraged
    if (str.trim() !== str) return false;
    if (!str.match(tagValuePattern)) return false;
    else return true;
}

export class TagsList {
    public tags: Tag[] = [];

    constructor(tagsString: string) {
        ow(tagsString, ow.string);
        if (tagsString.endsWith(';')) tagsString = tagsString.substring(0, tagsString.length - 1);
        if (tagsString.length === 0) return;

        const keyvals = tagsString.split(';');
        ow(keyvals.length % 2, ow.number.equal(0));

        for (let idx = 0; idx < keyvals.length / 2; idx++) {
            const key = keyvals[idx * 2];
            const value = keyvals[idx * 2 + 1];
            this.tags.push({ key, value });
        }
    }

    public asCLIOptions(): string[] {
        return this.tags.map((t) => `${t.key}=${t.value}`);
    }

    public asJSONFile(): { Key: string; Value: string }[] {
        return this.tags.map((t) => {
            return { Key: t.key, Value: t.value };
        });
    }

    public get length(): number {
        return this.tags.length;
    }
}
