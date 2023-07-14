import ow from 'ow';
import { TextEncoder } from 'util';

/**
 *
 * JavaScript (at runtime) is very bad at dealing with regex for unicode, there isn't
 * a clean native solution to exclude unprintable utf-8 character by matching RegEx pattern
 * without installing yet another dependent package. Moreover, when a input string from the
 * request contains a unprintable unicode character, the service code (ExpressJS) doesn't
 * interpret it and underlying AWS service SDKs don't have a consistent handling of these
 * characters. Therefore, we need to manually go through the string to guard against these
 * characters.
 * https://www.fileformat.info/info/charset/UTF-8/list.htm
 */

export const UNPRINTABLE_UTF_CHAR = new Set([
    '\u0000',
    '\u0001',
    '\u0002',
    '\u0003',
    '\u0004',
    '\u0005',
    '\u0006',
    '\u0007',
    '\u0008',
    '\u0009',
    '\u000A',
    '\u000B',
    '\u000C',
    '\u000D',
    '\u000E',
    '\u000F',
    '\u0010',
    '\u0011',
    '\u0012',
    '\u0013',
    '\u0014',
    '\u0015',
    '\u0016',
    '\u0017',
    '\u0018',
    '\u0019',
    '\u001A',
    '\u001B',
    '\u001C',
    '\u001D',
    '\u001E',
    '\u001F',
]);

export const owCheckUnprintableChar = (inputStr: string, label: string): void => {
    ow(
        inputStr,
        label,
        ow.string.validate((s) => ({
            validator: [...s].every((c) => !UNPRINTABLE_UTF_CHAR.has(c)),
            message: (l) => `Expected ${l} to not have unprintable string, got ${inputStr}`,
        })),
    );
};

export const owCheckOversizeString = (inputStr: string, size: number, label: string): void => {
    ow(
        new TextEncoder().encode(inputStr).length,
        label,
        ow.number
            .lessThanOrEqual(size)
            .message((v, l) => `Expected ${l} to not exceed ${size}, got ${v}`),
    );
};

export const owCheckOptionalNumber = (
    num: any,
    minSize: number,
    maxSize: number,
    label: string,
): void => {
    if (num === undefined) {
        return;
    }
    const numToCheck = Number(num);
    ow(numToCheck, label, ow.number.greaterThanOrEqual(minSize));
    ow(numToCheck, label, ow.number.lessThanOrEqual(maxSize));
};
