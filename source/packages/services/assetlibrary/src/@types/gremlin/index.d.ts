/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

/* eslint @typescript-eslint/no-explicit-any: 0 */
/* eslint @typescript-eslint/explicit-module-boundary-types: 0 */
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

        export class AnonymousTraversalSource {
            constructor();
            static traversal(): AnonymousTraversalSource;
            withRemote(conn: driver.RemoteConnection): AnonymousTraversalSource;
        }

        export class GraphTraversalSource {
            withRemote(conn: driver.RemoteConnection): GraphTraversalSource;
            toString(): string;
            withBulk(...args: unknown[]): GraphTraversalSource;
            withPath(...args: unknown[]): GraphTraversalSource;
            withSack(...args: unknown[]): GraphTraversalSource;
            withSideEffect(...args: unknown[]): GraphTraversalSource;
            withStrategies(...args: unknown[]): GraphTraversalSource;
            withoutStrategies(...args: unknown[]): GraphTraversalSource;
            E(...args: unknown[]): GraphTraversal;
            V(...args: unknown[]): GraphTraversal;
            addE(...args: unknown[]): GraphTraversal;
            addV(...args: unknown[]): GraphTraversal;
            inject(...args: unknown[]): GraphTraversal;
            io(...args: unknown[]): GraphTraversal;
        }

        export class GraphTraversal extends process.Traversal {
            V(...args: unknown[]): GraphTraversal;
            addE(...args: unknown[]): GraphTraversal;
            addV(...args: unknown[]): GraphTraversal;
            aggregate(...args: unknown[]): GraphTraversal;
            and(...args: unknown[]): GraphTraversal;
            as(...args: unknown[]): GraphTraversal;
            barrier(...args: unknown[]): GraphTraversal;
            both(...args: unknown[]): GraphTraversal;
            bothE(...args: unknown[]): GraphTraversal;
            bothV(...args: unknown[]): GraphTraversal;
            branch(...args: unknown[]): GraphTraversal;
            by(...args: unknown[]): GraphTraversal;
            cap(...args: unknown[]): GraphTraversal;
            choose(...args: unknown[]): GraphTraversal;
            coalesce(...args: unknown[]): GraphTraversal;
            coin(...args: unknown[]): GraphTraversal;
            constant(...args: unknown[]): GraphTraversal;
            count(...args: unknown[]): GraphTraversal;
            cyclicPath(...args: unknown[]): GraphTraversal;
            dedup(...args: unknown[]): GraphTraversal;
            drop(...args: unknown[]): GraphTraversal;
            emit(...args: unknown[]): GraphTraversal;
            filter(...args: unknown[]): GraphTraversal;
            flatMap(...args: unknown[]): GraphTraversal;
            fold(...args: unknown[]): GraphTraversal;
            from_(...args: unknown[]): GraphTraversal;
            group(...args: unknown[]): GraphTraversal;
            groupCount(...args: unknown[]): GraphTraversal;
            has(...args: unknown[]): GraphTraversal;
            hasId(...args: unknown[]): GraphTraversal;
            hasKey(...args: unknown[]): GraphTraversal;
            hasLabel(...args: unknown[]): GraphTraversal;
            hasNot(...args: unknown[]): GraphTraversal;
            hasValue(...args: unknown[]): GraphTraversal;
            id(...args: unknown[]): GraphTraversal;
            identity(...args: unknown[]): GraphTraversal;
            in_(...args: unknown[]): GraphTraversal;
            inE(...args: unknown[]): GraphTraversal;
            inV(...args: unknown[]): GraphTraversal;
            inject(...args: unknown[]): GraphTraversal;
            is(...args: unknown[]): GraphTraversal;
            key(...args: unknown[]): GraphTraversal;
            label(...args: unknown[]): GraphTraversal;
            limit(...args: unknown[]): GraphTraversal;
            local(...args: unknown[]): GraphTraversal;
            loops(...args: unknown[]): GraphTraversal;
            map(...args: unknown[]): GraphTraversal;
            match(...args: unknown[]): GraphTraversal;
            math(...args: unknown[]): GraphTraversal;
            max(...args: unknown[]): GraphTraversal;
            mean(...args: unknown[]): GraphTraversal;
            min(...args: unknown[]): GraphTraversal;
            not(...args: unknown[]): GraphTraversal;
            option(...args: unknown[]): GraphTraversal;
            optional(...args: unknown[]): GraphTraversal;
            or(...args: unknown[]): GraphTraversal;
            order(...args: unknown[]): GraphTraversal;
            otherV(...args: unknown[]): GraphTraversal;
            out(...args: unknown[]): GraphTraversal;
            outE(...args: unknown[]): GraphTraversal;
            outV(...args: unknown[]): GraphTraversal;
            pageRank(...args: unknown[]): GraphTraversal;
            path(...args: unknown[]): GraphTraversal;
            peerPressure(...args: unknown[]): GraphTraversal;
            profile(...args: unknown[]): GraphTraversal;
            program(...args: unknown[]): GraphTraversal;
            project(...args: unknown[]): GraphTraversal;
            properties(...args: unknown[]): GraphTraversal;
            property(...args: unknown[]): GraphTraversal;
            propertyMap(...args: unknown[]): GraphTraversal;
            range(...args: unknown[]): GraphTraversal;
            repeat(...args: unknown[]): GraphTraversal;
            sack(...args: unknown[]): GraphTraversal;
            sample(...args: unknown[]): GraphTraversal;
            select(...args: unknown[]): GraphTraversal;
            sideEffect(...args: unknown[]): GraphTraversal;
            simplePath(...args: unknown[]): GraphTraversal;
            skip(...args: unknown[]): GraphTraversal;
            store(...args: unknown[]): GraphTraversal;
            subgraph(...args: unknown[]): GraphTraversal;
            sum(...args: unknown[]): GraphTraversal;
            tail(...args: unknown[]): GraphTraversal;
            timeLimit(...args: unknown[]): GraphTraversal;
            times(...args: unknown[]): GraphTraversal;
            to(...args: unknown[]): GraphTraversal;
            toE(...args: unknown[]): GraphTraversal;
            toV(...args: unknown[]): GraphTraversal;
            tree(...args: unknown[]): GraphTraversal;
            unfold(...args: unknown[]): GraphTraversal;
            union(...args: unknown[]): GraphTraversal;
            until(...args: unknown[]): GraphTraversal;
            value(...args: unknown[]): GraphTraversal;
            valueMap(...args: unknown[]): GraphTraversal;
            values(...args: unknown[]): GraphTraversal;
            where(...args: unknown[]): GraphTraversal;
            with_(...args: unknown[]): GraphTraversal;
            write(...args: unknown[]): GraphTraversal;
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
            addStrategy(stratey:TraversalStrategy): void;
            applyStrategies(stratey:Traversal): Promise<void>;

        }

        export class TraversalStrategy {
            apply(stratey:Traversal): void;
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
            static neq(args: unknown): P;
            static not(...args: unknown[]): P;
            static outside(first:number, second:number): P;
            static test(...args: unknown[]): P;
            static within(...args: unknown[]): P;
            static without(...args: unknown[]): P;
        }

        class TextP {
            constructor(operator: EnumValue, value: string, other?: any);
            toString(): string;
            and(arg?: any): P;
            or(arg?: any): P;
            static containing(...args: any[]): TextP;
            static endingWith(...args: any[]): TextP;
            static notContaining(...args: any[]): TextP;
            static notEndingWith(...args: any[]): TextP;
            static notStartingWith(...args: any[]): TextP;
            static startingWith(...args: any[]): TextP;
        }

        export class Traversal {
            toList(): Promise<Traverser[]>;
            hasNext(): Promise<boolean>;
            iterate(): Promise<Traverser[]>;
            next(): Promise<{value:Traverser | TraverserValue | TraverserMapValue, done:boolean}>;
            toString(): string;
        }

        export class TraversalSideEffects {
        }

        export const withOptions : {
            tokens: '~tinkerpop.valueMap.tokens',
            none: 0,
            ids: 1,
            labels: 2,
            keys: 4,
            values: 8,
            all: 15,
            indexer: '~tinkerpop.index.indexer',
            list: 0,
            map: 1
        };

        export type TraverserValue = string | string[] | number | number[] | boolean | boolean[];
        export type TraverserMapValue = {[key:string]: TraverserValue};

        export class Traverser {
            constructor(unknown:unknown, bulk:number);
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
            constructor(url: string, options:any);
        }

        export class RemoteTraversal extends process.Traversal {

        }

        export class RemoteStrategy extends process.TraversalStrategy {

        }

        export class DriverRemoteConnection extends RemoteConnection {
            close():Promise<void>;
        }
    }
}
