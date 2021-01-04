'use strict'

/**
 * pnpm uses this file to override 3rd party package dependencies which is useful
 * when 3rd party package.json's are missing dependencies, or when upstream changes
 * have broken a 3rd psrty package and we can't wait for a fix.
 */

module.exports = {
    hooks: {
        readPackage
    }
}

function readPackage(pkg, context) {

    switch (pkg.name) {

        case 'winston-transport':

            context.log('pnpmfile.js: logform should be a dependency of winston-transport, but is configured as a devDependency.')
            pkg.dependencies['logform'] = pkg.devDependencies.logform
            delete pkg.devDependencies.winston
            break;

        case 'inversify-express-utils':

            context.log('pnpmfile.js: @types/express should be a dependency of inversify-express-utils, but is configured as a devDependency.')
            pkg.dependencies['@types/express'] = pkg.devDependencies['@types/express']
            delete pkg.devDependencies['@types/express']

            context.log('pnpmfile.js: inversify should be a dependency of inversify-express-utils, but is configured as a devDependency.')
            pkg.dependencies['inversify'] = pkg.devDependencies.inversify
            delete pkg.devDependencies.inversify
            break;

    }

    return pkg
}