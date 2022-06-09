import { load } from 'dotenv-flow';

const fileLocations = [
    __dirname + '/.env.defaults'
];

load(fileLocations);

console.log(`Module device-patcher-client loaded config: ${JSON.stringify(process.env, null, 2)}`);
