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

import {isValidTagKey, isValidTagValue, TagsList} from './tags';

const VALID_TAG_KEYS_AND_VALID_TAG_VALUES = [
  'abc', 'ABC', 'AbC', 'abc+def',  'abc+def', 'abc@def.com', '01:02:03:04:05:06', 'abc=def', 'abc:def', 'abc_def',
  'åøüß', '北京', 'Αθήνα', 'София', '...', '+', '-', '=', '_', ':', '@', '@=+', 'x'.repeat(128)
];
const INVALID_TAG_KEYS_BUT_VALID_TAG_VALUE = [
  '', '.', '..', '_index',  'abc/def', 'abc///def', '/', 'http://abc.def', 'x'.repeat(129), 'x'.repeat(256),
  'aws:xyz', 'aws:cloudformation:stack-id',
  // various types and combinations of unicode spaces (https://www.compart.com/en/unicode/category/Zs)
  'abc def', 'abc\u0020def', 'abc\u2000def', 'abc\u2005def', 'abc\u2008def', 'abc\u205Fdef', 'abc\u3000def',
  'abc\u0020 \u3000def',
];
const INVALID_TAG_KEYS_AND_INVALID_TAG_VALUES = [
  'abc\\def', 'abc&def', 'abc^def', 'abc%def', 'abc*def', 'abc(def)', 'abc[def]', 'abc{def}', '*', '&', '>', 'abc;def',
  'abc,def', '#!', '==>', '<>', ' startswithspace', 'endswithspace    ', ' ', '\u0020 ',
];

describe('isValidTagKey', () => {
  VALID_TAG_KEYS_AND_VALID_TAG_VALUES.forEach((tagKey) => {
    it(`should return true for the valid tag key "${tagKey}"`, async () => {
      expect(isValidTagKey(tagKey)).toStrictEqual(true);
    });
  })

  const allInvalidKeys= [...INVALID_TAG_KEYS_BUT_VALID_TAG_VALUE, ...INVALID_TAG_KEYS_AND_INVALID_TAG_VALUES];
  allInvalidKeys.forEach((tagKey) => {
    it(`should return false for the invalid tag key "${tagKey}"`, async () => {
      expect(isValidTagKey(tagKey)).toStrictEqual(false);
    });
  });
});

describe('isValidTagValue', () => {
  const allValidValues= [...VALID_TAG_KEYS_AND_VALID_TAG_VALUES, ...INVALID_TAG_KEYS_BUT_VALID_TAG_VALUE];
  allValidValues.forEach((tagValue) => {
    it(`should return true for the valid tag value "${tagValue}"`, async () => {
      expect(isValidTagValue(tagValue)).toStrictEqual(true);
    });
  })

  INVALID_TAG_KEYS_AND_INVALID_TAG_VALUES.forEach((tagValue) => {
    it(`should return false for the invalid tag value "${tagValue}"`, async () => {
      expect(isValidTagValue(tagValue)).toStrictEqual(false);
    });
  });
});

describe('TagsList', () => {
  it('should parse a semicolon separated list', async () => {
    const tl = new TagsList('abc;d=ef;ghi;1 2z');
    expect(tl.tags).toStrictEqual([{key: 'abc', value: 'd=ef'}, {key: 'ghi', value: '1 2z'}]);
  });

  it('should fail parsing a semicolon separated list with an odd number of elements', async () => {
    expect(() => new TagsList('a;b;c')).toThrowError();
  });

  it('should correctly handle trailing semicolong', async () => {
    const tl = new TagsList('a;b;c;d;');
    expect(tl.tags).toStrictEqual([{key: 'a', value: 'b'}, {key: 'c', value: 'd'}]);
  });

  it('should return correctly formatted AWS CLI options', async () => {
    const tl = new TagsList('abc;d=ef;ghi;1 2z');
    expect(tl.asCLIOptions()).toStrictEqual(['abc=d=ef', 'ghi=1 2z']);
  });
});
