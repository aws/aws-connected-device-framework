/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { ExpressionParser, ExpressionSanitizer } from './expression.util';

describe('ExpressionParserUtil', () => {
    it('should parse a simple expression and return properties list', () => {
        const testExpression = ['it.foo'];
        const testExpressionKeys = ['foo'];
        const parser = new ExpressionParser(testExpression);

        const keys = parser.extractKeys();

        expect(keys).toEqual(testExpressionKeys);
    });

    it('should parse a complex expression and return properties list and also exclude duplicates', () => {
        const testExpressions = [
            'it.principalValue',
            'it[\'roller.left_proximity_position_threshold__1\'] || it.foobar && it.principalValue'
        ];
        const testExpressionKeys = [ 'principalValue',
            'roller.left_proximity_position_threshold__1',
            'foobar'
        ];
        const parser = new ExpressionParser(testExpressions);

        const keys = parser.extractKeys();

        expect(keys).toEqual(testExpressionKeys);
    });

    it('should throw an error if an invalid expression is parsed', () => {
        const testExpressions = ['=it.foo'];
        try {
            const parser = new ExpressionParser(testExpressions);
            parser.extractKeys();
        } catch (err) {
            expect(err).toBeDefined();
        }

    });
});

describe('ExpressionSanitizerUtil', () => {
    it('should sanitize an expression template', () => {
        const testRawExpressionTemplate = '{{=it.foo}}';
        const expectedExpression = ['it.foo'];
        const sanitizer = new ExpressionSanitizer(testRawExpressionTemplate);
        const sanitizedExpression = sanitizer.sanitize();

        expect(sanitizedExpression).toEqual(expectedExpression);
    });

    it('should sanitize an expression template', () => {
        const testRawExpressionTemplate = '{{=it.foo || =it.bar && =it[\'foobar\']}}';
        const expectedExpression = ['it.foo || it.bar && it[\'foobar\']'];
        const sanitizer = new ExpressionSanitizer(testRawExpressionTemplate);
        const sanitizedExpression = sanitizer.sanitize();

        expect(sanitizedExpression).toEqual(expectedExpression);
    });

    // Need more complext Regex to extract templates within templates, will skip for now
    it('should sanitize a nested expression template', () => {
        const testRawExpressionTemplate = 'The device {{=it.principalValue}} {{=it[\'roller.left_proximity_position_threshold__1\'] || =it.foobar}}';
        const expectedExpression = ['it.principalValue', 'it[\'roller.left_proximity_position_threshold__1\'] || it.foobar'];
        const sanitizer = new ExpressionSanitizer(testRawExpressionTemplate);
        const sanitizedExpression = sanitizer.sanitize();

        expect(sanitizedExpression).toEqual(expectedExpression);
    });
});
