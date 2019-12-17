/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import {TypesDaoFull} from './types.full.dao';
import { createMockInstance } from 'jest-create-mock-instance';
import { structure } from 'gremlin';
import { TypeRelationsModel } from './types.models';

describe('TypesDao', () => {
    let mockedGraph: jest.Mocked<structure.Graph>;
    let instance: TypesDaoFull;

    beforeEach(() => {
        mockedGraph = createMockInstance(structure.Graph);
        instance = new TypesDaoFull('neptuneUrl', ()=> mockedGraph);
    });

    it('All incoming links removed', async () => {
        const existing = new TypeRelationsModel();
        existing.in = {
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations in.key removed', async () => {
        const existing = new TypeRelationsModel();
        existing.in = {
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();
        updated.in = {
            installed_at: ['site']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({installed_at: ['site']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations in.key.type changed', async () => {
        const existing = new TypeRelationsModel();
        existing.in = {
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();
        updated.in = {
            located_at: ['site','group']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({located_at: ['group']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations in.key.type removed', async () => {
        const existing = new TypeRelationsModel();
        existing.in = {
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();
        updated.in = {
            located_at: ['group']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({located_at: ['group']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations out added', async () => {
        const existing = new TypeRelationsModel();
        existing.in = {
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            located_at: ['location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({located_at: ['location']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations out.key added', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
            installed_at: ['location']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            located_at: ['location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({located_at: ['location']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['location']});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.key.type added', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
            installed_at: ['location']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            installed_at: ['group']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({installed_at: ['group']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['location']});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys changed order', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
            installed_at: ['location'],
            located_at: ['site']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            located_at: ['site'],
            installed_at: ['location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types changed order', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
            installed_at: ['location','site']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            installed_at: ['site','location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types 1 added', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
            installed_at: ['location']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            installed_at: ['site','location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({installed_at: ['site']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types 1 removed', async () => {
        const existing = new TypeRelationsModel();
        existing.out = {
                installed_at: ['site','location']
        };
        const updated = new TypeRelationsModel();
        updated.out = {
            installed_at: ['location']
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['site']});
        expect(changes.remove.in).toEqual({});
    });
});
