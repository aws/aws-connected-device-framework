import fs from 'fs';
import { injectable } from 'inversify';
import yaml from 'js-yaml';
import ow from 'ow';
import { logger } from '../utils/logger';

@injectable()
export class LocalStateManager {
    constructor(private _location: string) {
        ow(_location, ow.string.nonEmpty);
    }

    public read(): unknown {
        try {
            const fileContents = fs.readFileSync(this._location, 'utf8');
            return yaml.safeLoad(fileContents);
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }

    public save(data: unknown): void {
        try {
            const asYaml = yaml.safeDump(data);
            fs.writeFileSync(this._location, asYaml, 'utf8');
        } catch (e) {
            logger.error(e);
            throw e;
        }
    }
}
