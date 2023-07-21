import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { lambdaZip } from '.';

const defaultArray: string[] = [];
const args = yargs(hideBin(process.argv))
    .options({
        copy: {
            type: 'array',
            description:
                'colon-separated copy configurations in the form to:from or to:from:pattern',
            default: defaultArray,
        },
        'entry-point': {
            type: 'array',
            description: 'Specifies an entry point',
            demandOption: true,
        },
        external: {
            type: 'array',
            description: 'Specifies a package to be treated as external',
            default: defaultArray,
        },
        out: {
            type: 'string',
            description: 'Zip file to write the bundle to',
            default: 'bundle.zip',
        },
    })
    .check((args) => {
        for (const copyPair of args['copy']) {
            const tuple = String(copyPair).split(':');
            if (tuple.length !== 2 && tuple.length !== 3)
                throw new Error(`${copyPair} does not match to:from or to:from:glob format`);
        }
        return true;
    })
    .parseSync();

lambdaZip({
    copy: args.copy.map((v) => {
        const [to, from, pattern] = String(v).split(':');
        return { to, from, pattern };
    }),
    build: {
        entryPoints: args.entryPoint.map(String),
        external: args.external.map(String),
    },
    outZip: args.out,
});
