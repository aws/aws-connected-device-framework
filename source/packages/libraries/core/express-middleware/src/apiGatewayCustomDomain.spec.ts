import {normalisePath} from "./apiGatewayCustomDomain";

describe('Api Gateway Custom Domain Middleware', () => {
    test.each
        `
          originalPath   | basePath    | sanitisedPath
          ${'https://api.com/fakePath/commands/test'} | ${'fakePath'} | ${'https://api.com/commands/test'}
          ${'https://api.com/fakePath/commands/test'} | ${'/fakePath'} | ${'https://api.com/commands/test'}
          ${'https://api.com/fakePath/commands/fakePath/test'} | ${'/fakePath'} | ${'https://api.com/commands/fakePath/test'}
          ${'https://api.com/parentPath/childrenPath/commands/test'} | ${'parentPath/childrenPath'} | ${'https://api.com/commands/test'}
          ${'https://api.com/parentPath/childrenPath/commands/test'} | ${'/parentPath/childrenPath'} | ${'https://api.com/commands/test'}
          ${'https://api.com/commands/test'} | ${'fakePath'} | ${'https://api.com/commands/test'}
        `
    ('should convert [ $originalPath ] to [ $sanitisedPath ] given configuration set to [ $basePath ]', ({originalPath, basePath, sanitisedPath}) => {
        expect(normalisePath(originalPath, basePath)).toBe(sanitisedPath);
    });
});
