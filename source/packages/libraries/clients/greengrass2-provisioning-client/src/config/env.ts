import { load } from 'dotenv-flow';

const fileLocations = [
    __dirname + '/.env.defaults'
];

load(fileLocations);

console.log(`Module greengrass2-provisioning-client loaded config: ${JSON.stringify(process.env, null, 2)}`);
