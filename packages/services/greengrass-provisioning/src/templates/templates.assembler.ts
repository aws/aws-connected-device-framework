/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger.util';
import { TemplateResource, TemplateItem, TemplateResourceList, TemplateItemList } from './templates.models';

@injectable()
export class TemplatesAssembler {

    public fromResource(res: TemplateResource): TemplateItem {
        logger.debug(`templates.assembler fromResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`templates.assembler fromResource: exit: res: undefined`);
            return undefined;
        }

        const item = new TemplateItem();

        // common properties
        Object.keys(res).forEach(key=> {
            item[key] = res[key];
        });

        logger.debug(`templates.assembler fromResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public toResource(item: TemplateItem): (TemplateResource) {
        logger.debug(`templates.assembler toResource: in: item: ${JSON.stringify(item)}`);

        if (item===undefined) {
            logger.debug(`templates.assembler toResource: exit: item: undefined`);
            return undefined;
        }

        const resource = new TemplateResource();

        // common properties
        Object.keys(item).forEach(key=> {
            resource[key] = item[key];
        });

        logger.debug(`templates.assembler toResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toResourceList(items:TemplateItemList): TemplateResourceList {
        logger.debug(`templates.assembler toResourceList: in: items:${JSON.stringify(items)}`);

        const list:TemplateResourceList= {
            templates:[],
            pagination: items.pagination
        };

        items.templates.forEach(i=> list.templates.push(this.toResource(i)));

        logger.debug(`templates.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }
}
