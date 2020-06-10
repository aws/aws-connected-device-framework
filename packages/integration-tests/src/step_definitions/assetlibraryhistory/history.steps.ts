/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { setDefaultTimeout, TableDefinition, Then, When} from 'cucumber';
import {
    EventsService,
    ObjectEventsRequest,
    Events,
    ASSETLIBRARYHISTORY_CLIENT_TYPES,
} from '@cdf/assetlibraryhistory-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
import {AUTHORIZATION_TOKEN, RESPONSE_STATUS, TIME_SCENARIO_STARTED} from '../common/common.steps';
import {container} from '../../di/inversify.config';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';
use(chai_string);

setDefaultTimeout(10 * 1000);

const RESULTS = 'results';

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const eventsService:EventsService = container.get(ASSETLIBRARYHISTORY_CLIENT_TYPES.EventsService);
function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

When('I retrieve {int} history records for {word} {string}', async function ( qty:number, category:string, objectId:string) {

    try {
        const params:ObjectEventsRequest = {
            category: `${category}s`,
            objectId,
            limit: qty
        };
        const r = await eventsService.listObjectEvents(params, getAdditionalHeaders(this));
        this[RESULTS]=r;
        expect(r.events.length).eq(qty);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        fail(`Expected response, instead: ${err}`);
    }
});

When('I retrieve next {int} history records for {word} {string}', async function ( qty:number, category:string, objectId:string) {

    const token = (this[RESULTS] as Events).pagination.token;

    try {
        const params:ObjectEventsRequest = {
            category: `${category}s`,
            objectId,
            token,
            limit: qty
        };
        const r = await eventsService.listObjectEvents(params, getAdditionalHeaders(this));
        this[RESULTS]=r;
        expect(r.events.length).eq(qty);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        fail(`Expected response, instead: ${err}`);
    }
});

Then('{int} history records exist since the test started for {word} {string}', async function (qty:number, category:string, objectId:string) {

    try {
        const params:ObjectEventsRequest = {
            category: `${category}s`,
            objectId,
            timeFrom: this[TIME_SCENARIO_STARTED]
        };
        const r = await eventsService.listObjectEvents(params, getAdditionalHeaders(this));
        this[RESULTS]=r;
        expect(r.events.length).eq(qty);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        fail(`Expected response, instead: ${err}`);
    }
});

Then('history record {int} contains attributes', async function (index:number, data:TableDefinition) {

    const d = data.rowsHash();

    const e:Events = this[RESULTS];
    expect(e.events.length).gte(index-1);

    const r = (this[RESULTS] as Events).events[index-1];

    Object.keys(d).forEach( key => {
        const val = d[key];
        if (val.startsWith('{') || val.startsWith('[')) {
            expect(stringify(r[key])).eq( stringify(JSON.parse(val)));
        } else if (val==='___null___') {
            expect(r[key]).eq(null);
        } else if (val==='___undefined___') {
            expect(r[key]).eq(undefined);
        } else {
            expect(r[key]).eq( val);
        }
    });
});
