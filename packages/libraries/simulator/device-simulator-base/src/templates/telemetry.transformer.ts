import ow from 'ow';
import fs from 'fs';
import { logger } from '../utils/logger';
import { injectable } from 'inversify';
import mustache from 'mustache';

/**
 * Handles translating device attributes to telemetry
 * format, then publishing to AWS IoT Core.
 *
 */

@injectable()
export class TelemetryTransformer {

    private readonly CLASS_LOGGING_DATA = {class: 'TelemetryTransformer'};

    private _templates:TelemetryTemplates;

    constructor() {
        const logMeta = {...this.CLASS_LOGGING_DATA, method: 'constructor'};        
        logger.verbose('', {...logMeta, type: 'in'} );
    }

    public initialize(locations: TelemetryLocations) {
        const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'initialize'};
        logger.silly(`locations: ${JSON.stringify(locations)}`, {...logMeta, type: 'in'} );

        ow(Object.keys(locations || {}).length, 'telemetry locations', ow.number.greaterThan(0));
        
        // load and compile all templates
        this._templates= {};
        for (const key of Object.keys(locations)) {
            logger.silly(`key: ${key}`, {...logMeta, type: 'value'} )
            const location = locations[key];
            logger.silly(`location: ${location}`, {...logMeta, type: 'value'} )
            const template = fs.readFileSync(location, 'utf8');
            logger.silly(`template: ${template}`, {...logMeta, type: 'value'} )
            this._templates[key] = template;
        }
        logger.silly(`_templates: ${JSON.stringify(this._templates)}`, {...logMeta, type: 'value'} );

    }

    public processTelemetryData(templateKey:string, data:unknown) : unknown {
        const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'processServiceTelemetryData'};
        logger.silly(`templateKey: ${templateKey}`, {...logMeta, type: 'in'} );
        logger.silly(`data: ${JSON.stringify(data)}`, {...logMeta, type: 'in'} );
        logger.silly(`_templates: ${JSON.stringify(this._templates)}`, {...logMeta, type: 'value'} );

        if (Object.keys(this._templates || {}).length===0) {
            throw new Error('TEMPLATES_NOT_INITIALIZED');
        }
        
        const template = this._templates[templateKey];
        if (template===undefined) {
            throw new Error('TEMPLATE_KEY_NOT_FOUND');
        }

        const raw = mustache.render(template, data);
        logger.verbose(`raw: ${JSON.stringify(raw)}`, {...logMeta, type: 'value'} );

        const r = JSON.parse(raw);
        logger.silly(`exit: ${JSON.stringify(r)}`, {...logMeta, type: 'exit'} );
        return r;

    }

}

export type TelemetryLocations = {
    [key:string] : string
}

export type TelemetryTemplates = {
    [key:string] : string
}
