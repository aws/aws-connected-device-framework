/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import { ActivationResource, ActivationItem } from './activation.model';

@injectable()
export class ActivationAssembler {

    public fromResource(res: ActivationResource): ActivationItem {
        logger.debug(`activation.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`devices.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new ActivationItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`activation.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: ActivationItem): (ActivationResource) {
        logger.debug(`activation.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`devices.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new ActivationResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`activation.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }
}
