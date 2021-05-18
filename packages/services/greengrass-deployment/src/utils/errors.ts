/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { logger } from './logger';

export function handleError(e:Error, res:Response): void {
    logger.error(`handleError: ${e}`);

    if (
        e.name === 'ArgumentError' ||
        e.message.startsWith('MISSING_REQUIRED') ||
        e.message === 'FAILED_VALIDATION' ||
        e.message === 'UNSUPPORTED_TRANSITION' ||
        e.message === 'UNSUPPORTED_DEPLOYMENT_STATUS'
    ) {
        res.status(400).json({error: e.message}).end();
    } else if (
        e.message.endsWith('NOT_FOUND'))
    {
        res.status(404).json({error: 'Item not found'}).end();
    } else if (
        e.name==='ResourceNotFoundException')
    {
        res.status(404).json({error: e.message}).end();
    } else if (
        e.name === 'ConditionalCheckFailedException' ||
        e.message.indexOf('with id already exists')>=0 )
    {
        res.status(409).json({error: 'Item already exists'}).end();
    } else if (
        e.message === 'DEVICE_NOT_ACTIVATED_AS_HYBRID_INSTANCE'
    ) {
        res.status(409).json({error: e.message})
    } else {
        res.status(500).json({error: e.message}).end();
    }

    logger.error(`handleError: res.status: ${res.status}`);
}
