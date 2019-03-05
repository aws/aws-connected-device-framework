/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Before, setDefaultTimeout, TableDefinition, Then, When} from 'cucumber';
import { EventsService, ObjectEventsRequest, Events } from '@cdf/assetlibraryhistory-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
import { RESPONSE_STATUS, TIME_SCENARIO_STARTED } from '../common/common.steps';
use(chai_string);

setDefaultTimeout(10 * 1000);

const RESULTS = 'results';
let events: EventsService;

Before(function () {
    events = new EventsService();
});

When('I retrieve {int} history records for {word} {string}', async function ( qty:number, category:string, objectId:string) {

    try {
        const params:ObjectEventsRequest = {
            category: `${category}s`,
            objectId,
            limit: qty
        };
        const r = await events.listObjectEvents(params);
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
        const r = await events.listObjectEvents(params);
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
        const r = await events.listObjectEvents(params);
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
