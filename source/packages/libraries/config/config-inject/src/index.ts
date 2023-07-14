import { sanitized } from '@awssolutions/cdf-environment-sanitizer';
import { load } from 'dotenv-flow';
import dotenv from 'dotenv';

// APP_CONFIG contains list of environment variables
// This will be loaded first
if (process.env.APP_CONFIG) {
    const result = dotenv.parse(process.env.APP_CONFIG);
    console.log(`Loaded from APP_CONFIG: ${JSON.stringify(result)}`);
    Object.assign(process.env, result);
}

// APP_CONFIG_DIR is specified in cloudformation definition of lambda and npm run start of the services
// This will populate any value that is not specified by APP_CONFIG with default value (dotenv.load functionality)
const fileLocations = [process.env.APP_CONFIG_DIR + '/.env.defaults'];

if ((process.env.CONFIG_LOCATION?.length ?? 0) > 0) {
    console.log(`Loading config from ${process.env.CONFIG_LOCATION}`);
    fileLocations.push(process.env.CONFIG_LOCATION);
}

load(fileLocations);

console.log(`Module config-inject loaded config:`);
console.log(sanitized(process.env));
