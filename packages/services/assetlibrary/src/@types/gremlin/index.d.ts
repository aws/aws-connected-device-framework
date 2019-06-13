/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
declare module 'gremlin' {

    export namespace structure {
        export class Edge {
        }
        export class Graph {
            traversal(): process.GraphTraversalSource;
            toString(): string;
        }
        export class Path {
        }
        export class Property {
        }
        export class Vertex {
        }
        export class VertexProperty {
        }
    }
    export namespace process {

        export class GraphTraversalSource {
            withRemote(conn: driver.RemoteConnection): GraphTraversalSource;
            toString(): string;
            withBulk(...args: Object[]): GraphTraversalSource;
            withPath(...args: Object[]): GraphTraversalSource;
            withSack(...args: Object[]): GraphTraversalSource;
            withSideEffect(...args: Object[]): GraphTraversalSource;
            withStrategies(...args: Object[]): GraphTraversalSource;
            withoutStrategies(...args: Object[]): GraphTraversalSource;
            E(...args: Object[]): GraphTraversal;
            V(...args: Object[]): GraphTraversal;
            addE(...args: Object[]): GraphTraversal;
            addV(...args: Object[]): GraphTraversal;
            inject(...args: Object[]): GraphTraversal;
        }

        export class GraphTraversal extends process.Traversal {
            V(...args: Object[]): GraphTraversal;
            addE(...args: Object[]): GraphTraversal;
            addV(...args: Object[]): GraphTraversal;
            aggregate(...args: Object[]): GraphTraversal;
            and(...args: Object[]): GraphTraversal;
            as(...args: Object[]): GraphTraversal;
            barrier(...args: Object[]): GraphTraversal;
            both(...args: Object[]): GraphTraversal;
            bothE(...args: Object[]): GraphTraversal;
            bothV(...args: Object[]): GraphTraversal;
            branch(...args: Object[]): GraphTraversal;
            by(...args: Object[]): GraphTraversal;
            cap(...args: Object[]): GraphTraversal;
            choose(...args: Object[]): GraphTraversal;
            coalesce(...args: Object[]): GraphTraversal;
            coin(...args: Object[]): GraphTraversal;
            constant(...args: Object[]): GraphTraversal;
            count(...args: Object[]): GraphTraversal;
            cyclicPath(...args: Object[]): GraphTraversal;
            dedup(...args: Object[]): GraphTraversal;
            drop(...args: Object[]): GraphTraversal;
            emit(...args: Object[]): GraphTraversal;
            filter(...args: Object[]): GraphTraversal;
            flatMap(...args: Object[]): GraphTraversal;
            fold(...args: Object[]): GraphTraversal;
            from_(...args: Object[]): GraphTraversal;
            group(...args: Object[]): GraphTraversal;
            groupCount(...args: Object[]): GraphTraversal;
            has(...args: Object[]): GraphTraversal;
            hasId(...args: Object[]): GraphTraversal;
            hasKey(...args: Object[]): GraphTraversal;
            hasLabel(...args: Object[]): GraphTraversal;
            hasNot(...args: Object[]): GraphTraversal;
            hasValue(...args: Object[]): GraphTraversal;
            id(...args: Object[]): GraphTraversal;
            identity(...args: Object[]): GraphTraversal;
            in_(...args: Object[]): GraphTraversal;
            inE(...args: Object[]): GraphTraversal;
            inV(...args: Object[]): GraphTraversal;
            inject(...args: Object[]): GraphTraversal;
            is(...args: Object[]): GraphTraversal;
            key(...args: Object[]): GraphTraversal;
            label(...args: Object[]): GraphTraversal;
            limit(...args: Object[]): GraphTraversal;
            local(...args: Object[]): GraphTraversal;
            loops(...args: Object[]): GraphTraversal;
            map(...args: Object[]): GraphTraversal;
            match(...args: Object[]): GraphTraversal;
            math(...args: Object[]): GraphTraversal;
            max(...args: Object[]): GraphTraversal;
            mean(...args: Object[]): GraphTraversal;
            min(...args: Object[]): GraphTraversal;
            not(...args: Object[]): GraphTraversal;
            option(...args: Object[]): GraphTraversal;
            optional(...args: Object[]): GraphTraversal;
            or(...args: Object[]): GraphTraversal;
            order(...args: Object[]): GraphTraversal;
            otherV(...args: Object[]): GraphTraversal;
            out(...args: Object[]): GraphTraversal;
            outE(...args: Object[]): GraphTraversal;
            outV(...args: Object[]): GraphTraversal;
            pageRank(...args: Object[]): GraphTraversal;
            path(...args: Object[]): GraphTraversal;
            peerPressure(...args: Object[]): GraphTraversal;
            profile(...args: Object[]): GraphTraversal;
            program(...args: Object[]): GraphTraversal;
            project(...args: Object[]): GraphTraversal;
            properties(...args: Object[]): GraphTraversal;
            property(...args: Object[]): GraphTraversal;
            propertyMap(...args: Object[]): GraphTraversal;
            range(...args: Object[]): GraphTraversal;
            repeat(...args: Object[]): GraphTraversal;
            sack(...args: Object[]): GraphTraversal;
            sample(...args: Object[]): GraphTraversal;
            select(...args: Object[]): GraphTraversal;
            sideEffect(...args: Object[]): GraphTraversal;
            simplePath(...args: Object[]): GraphTraversal;
            skip(...args: Object[]): GraphTraversal;
            store(...args: Object[]): GraphTraversal;
            subgraph(...args: Object[]): GraphTraversal;
            sum(...args: Object[]): GraphTraversal;
            tail(...args: Object[]): GraphTraversal;
            timeLimit(...args: Object[]): GraphTraversal;
            times(...args: Object[]): GraphTraversal;
            to(...args: Object[]): GraphTraversal;
            toE(...args: Object[]): GraphTraversal;
            toV(...args: Object[]): GraphTraversal;
            tree(...args: Object[]): GraphTraversal;
            unfold(...args: Object[]): GraphTraversal;
            union(...args: Object[]): GraphTraversal;
            until(...args: Object[]): GraphTraversal;
            value(...args: Object[]): GraphTraversal;
            valueMap(...args: Object[]): GraphTraversal;
            values(...args: Object[]): GraphTraversal;
            where(...args: Object[]): GraphTraversal;
        }

        export const statics : {
            V: any;
            addE: any;
            addInE: any;
            addOutE: any;
            addV: any;
            aggregate: any;
            and: any;
            as: any;
            barrier: any;
            both: any;
            bothE: any;
            bothV: any;
            branch: any;
            cap: any;
            choose: any;
            coalesce: any;
            coin: any;
            constant: any;
            count: any;
            cyclicPath: any;
            dedup: any;
            drop: any;
            emit: any;
            filter: any;
            flatMap: any;
            fold: any;
            group: any;
            groupCount: any;
            groupV3d0: any;
            has: any;
            hasId: any;
            hasKey: any;
            hasLabel: any;
            hasNot: any;
            hasValue: any;
            id: any;
            identity: any;
            inE: any;
            inV: any;
            in_: any;
            inject: any;
            is: any;
            key: any;
            label: any;
            limit: any;
            local: any;
            loops: any;
            map: any;
            mapKeys: any;
            mapValues: any;
            match: any;
            max: any;
            mean: any;
            min: any;
            not: any;
            optional: any;
            or: any;
            order: any;
            otherV: any;
            out: any;
            outE: any;
            outV: any;
            path: any;
            project: any;
            properties: any;
            property: any;
            propertyMap: any;
            range: any;
            repeat: any;
            sack: any;
            sample: any;
            select: any;
            sideEffect: any;
            simplePath: any;
            store: any;
            subgraph: any;
            sum: any;
            tail: any;
            timeLimit: any;
            times: any;
            to: any;
            toE: any;
            toV: any;
            tree: any;
            unfold: any;
            union: any;
            until: any;
            value: any;
            valueMap: any;
            values: any;
            where: any;
        };

        export class TraversalStrategies {
        }

        export class TraversalStrategy {

        }

        export class EnumValue {
            constructor(typeName:string, elementName:string);
            toString(): string;
        }

        export class P {
            constructor(operator:string, value:string, other:string);
            toString(): string;
            and(other: P): P;
            or(other: P): P;

            static between(first:number|string, second:number|string): P;
            static eq(args: number|string): P;
            static gt(args: number): P;
            static gte(args: number): P;
            static inside(first:number, second:number): P;
            static lt(args: number): P;
            static lte(args: number): P;
            static neq(args: object): P;
            static not(...args: object[]): P;
            static outside(first:number, second:number): P;
            static test(...args: object[]): P;
            static within(...args: object[]): P;
            static without(...args: object[]): P;
        }
        export class Traversal {
            toList(): Promise<Traverser[]>;
            iterate(): Promise<Traverser[]>;
            next(): Promise<{value:Traverser | TraverserValue | TraverserMapValue, done:boolean}>;
            toString(): string;
        }

        export class TraversalSideEffects {
        }

        export type TraverserValue = string | string[] | number | number[] | boolean | boolean[];
        export type TraverserMapValue = {[key:string]: TraverserValue};

        export class Traverser {
            constructor(object:object, bulk:number);
            [key: string]: TraverserValue;
        }

        export const barrier: {
            normSack: string;
        };

        export const cardinality: {
            list: string;
            set: string;
            single: string;
        };

        export const column: {
            keys: string;
            values: string;
        };

        export const direction: {
            BOTH: string;
            IN: string;
            OUT: string;
        };

        export const graphSONVersion: {
            V1_0: string;
            V2_0: string;
            V3_0: string;
        };

        export const gyroVersion: {
            V1_0: string;
            V3_0: string;
        };

        export const operator: {
            addAll: string;
            and: string;
            assign: string;
            div: string;
            max: string;
            min: string;
            minus: string;
            mult: string;
            or: string;
            sum: string;
            sumLong: string;
        };

        export const order: {
            asc: string;
            decr: string;
            desc: string;
            incr: string;
            shuffle: string;
        };

        export const pick: {
            any: string;
            none: string;
        };

        export const pop: {
            all: string;
            first: string;
            last: string;
            mixed: string;
        };

        export const scope: {
            global: string;
            local: string;
        };

        export const t: {
            id: string;
            key: string;
            label: string;
            value: string;
        };

    }

    export namespace driver {
        export class RemoteConnection {
            constructor(url: string);
        }

        export class RemoteTraversal extends process.Traversal {

        }

        export class RemoteStrategy extends process.TraversalStrategy {

        }

        export class DriverRemoteConnection extends RemoteConnection {

        }
    }
}
