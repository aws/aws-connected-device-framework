import { sanitized } from './environment-sanitizer';

describe('environment-sanitizer sanitized function', () => {
    describe('when invoked with dictionary containing both secure and insecure keys', () => {
        const expectedInsecureKeys = [
            'AWS_SESSION_TOKEN',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_ACCESS_KEY_ID',
        ];

        const testEnv = {
            AWS_SESSION_TOKEN: 'unsafe1',
            SOME_OTHER_VALUE: 'this is safe',
            ANOTHER_VALUE: 'safe',
            AWS_ACCESS_KEY_ID: 'unsafe2',
            NAME: 'safe also',
            AWS_SECRET_ACCESS_KEY: 'unsafe3',
            SAFE_VALUE: '12345',
        };

        const expectedRedactedValue = '********';

        let testEnvParam = {};
        let testEnvSanitized = {};

        beforeEach(() => {
            // keep testEnv separate from function parameter.
            // If the function erroneously modifies the parameter, this will keep extra tests from failing.
            testEnvParam = { ...testEnv };

            testEnvSanitized = sanitized(testEnvParam);
        });

        afterEach(() => {
            testEnvParam = {};
            testEnvSanitized = {};
        });

        it('should replace insecure key values with "********"', () => {
            for (const testKey of expectedInsecureKeys) {
                expect(testEnvSanitized[testKey]).toBe(expectedRedactedValue);
            }
        });

        it('should leave secure key values as-is', () => {
            expect(Object.keys(testEnvSanitized).length).toBe(Object.keys(testEnv).length);
            for (const [key, value] of Object.entries(testEnvSanitized)) {
                if (!expectedInsecureKeys.includes(key)) {
                    expect(value).toBe(testEnv[key]);
                }
            }
        });

        it('should leave original dictionary as-is', () => {
            expect(testEnvParam).toEqual(testEnv);
        });
    });
});
