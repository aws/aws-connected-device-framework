import { injectable } from 'inversify';
import ow from 'ow';
import {logger} from '../utils/logger';

@injectable()
export class LocalStateManager {

    constructor(private _location:string) {
        ow(_location, ow.string.nonEmpty);
    }

    public read() : unknown {
        const fs = require('fs');
        const yaml = require('js-yaml');
        try {
            const fileContents = fs.readFileSync(this._location, 'utf8');
            return yaml.safeLoad(fileContents);
        } catch (e) {
           logger.error(e);
           throw e;
        }
    }

    public save(data:unknown) : void {
        const fs = require('fs');
        const yaml = require('js-yaml');
        try {
            const asYaml = yaml.safeDump(data);
            fs.writeFileSync(this._location, asYaml, 'utf8');
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
}
