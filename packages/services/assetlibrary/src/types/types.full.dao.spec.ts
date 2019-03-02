/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import {TypesDaoFull} from './types.full.dao';
import { createMockInstance } from 'jest-create-mock-instance';
import { process } from 'gremlin';

describe('TypesDao', () => {
    let mockedGraphTraversalSource: jest.Mocked<process.GraphTraversalSource>;
    let instance: TypesDaoFull;

    beforeEach(() => {
        mockedGraphTraversalSource = createMockInstance(process.GraphTraversalSource);
        instance = new TypesDaoFull(()=> mockedGraphTraversalSource);
    });

    it('All incoming links removed', async () => {
        const existing = {
            in: {
                located_at: ['site']
            }
        };
        const updated = {};

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations in.key removed', async () => {
        const existing = {
            in: {
                located_at: ['site']
            }
        };
        const updated = {
            in: {
                installed_at: ['site']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({installed_at: ['site']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations in.key.type changed', async () => {
        const existing = {
            in: {
                located_at: ['site']
            }
        };
        const updated = {
            in: {
                located_at: ['site','group']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({located_at: ['group']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations in.key.type removed', async () => {
        const existing = {
            in: {
                located_at: ['site']
            }
        };
        const updated = {
            in: {
                located_at: ['group']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({located_at: ['group']});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations out added', async () => {
        const existing = {
            in: {
                located_at: ['site']
            }
        };
        const updated = {
            out: {
                located_at: ['location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({located_at: ['location']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({located_at: ['site']});
    });

    it('Relations out.key added', async () => {
        const existing = {
            out: {
                installed_at: ['location']
            }
        };
        const updated = {
            out: {
                located_at: ['location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({located_at: ['location']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['location']});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.key.type added', async () => {
        const existing = {
            out: {
                installed_at: ['location']
            }
        };
        const updated = {
            out: {
                installed_at: ['group']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({installed_at: ['group']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['location']});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys changed order', async () => {
        const existing = {
            out: {
                installed_at: ['location'],
                located_at: ['site']
            }
        };
        const updated = {
            out: {
                located_at: ['site'],
                installed_at: ['location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types changed order', async () => {
        const existing = {
            out: {
                installed_at: ['location','site']
            }
        };
        const updated = {
            out: {
                installed_at: ['site','location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types 1 added', async () => {
        const existing = {
            out: {
                installed_at: ['location']
            }
        };
        const updated = {
            out: {
                installed_at: ['site','location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({installed_at: ['site']});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({});
        expect(changes.remove.in).toEqual({});
    });

    it('Relations out.keys.types 1 removed', async () => {
        const existing = {
            out: {
                installed_at: ['site','location']
            }
        };
        const updated = {
            out: {
                installed_at: ['location']
            }
        };

        const changes = instance.__private___identifyChangedRelations(existing, updated);

        expect(changes.add.out).toEqual({});
        expect(changes.add.in).toEqual({});
        expect(changes.remove.out).toEqual({installed_at: ['site']});
        expect(changes.remove.in).toEqual({});
    });
});
