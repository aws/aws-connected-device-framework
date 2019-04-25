declare module 'json-rules-engine' {
    export class Engine {

        constructor(rules?:Rule[], options?:any);

        addRule(properties:Rule|RuleOptions) : Engine;
        removeRule(rule:Rule) : boolean;
        addOperator(operatorOrName:Operator|string, cb:()=> void) : void;
        removeOperator(operatorOrName:Operator|string) : any;
        addFact(id:string|Fact, valueOrMethod:(()=>void)|any, options?:object) : Engine;
        removeFact(factOrId:string|Fact) : any;
        prioritizeRules () : Rule[][];
        stop () : Engine;
        getFact (factId:string) : Fact;
        evaluateRules (ruleArray:Rule[], almanac:Almanac) : Promise<void>;
        run (runtimeFacts?:any) : Promise<Rule[]>;

    }
    export class Fact {

        constructor (id:string, valueOrMethod:(()=>void)|object, options?:object);

        isConstant () : boolean;
        isDynamic () : boolean;
        calculate (params:object, almanac:Almanac) : any;
        defaultCacheKeys (id:string, params:object) : object;
        getCacheKey (params:object) : string;

    }
    export class Rule {
        constructor (options:RuleOptions) ;

        setPriority (priority:number) : Rule;
        setConditions (conditions:Condition[]) : Rule;
        setEvent (event:object) : Rule;
        setEngine (engine:Engine) : Rule;
        toJSON (stringify:boolean) : Rule;
        prioritizeConditions (conditions:Condition[]) : Condition[][];
        evaluate (almanac:Almanac) : Promise<RuleResult>;

    }

    export interface RuleOptions {
        conditions: RuleConditionsOptions;
        event: {
            type: string;
            params?: {[key:string]:string}
        };

        priority?: number;
    }
    export interface RuleConditionsOptions {
        all?: RuleConditionsOptions|RuleConditionOptions[];
        any?: RuleConditionsOptions|RuleConditionOptions[];
    }

    export interface RuleConditionOptions {
        fact:string;
        operator:string;
        value:number|string|boolean;
    }

    export class RuleResult {
        constructor(conditions:Condition[], event:any, priority:any);

        setResult (result:any) : void;
        toJSON (stringify:true) : any;
    }

    export class Operator {
        constructor (name:string, cb:(factValue:string, jsonValue:any)=>void, factValueValidator:()=>void);
        evaluate (factValue:any, jsonValue:any) : boolean;
    }

    export class Condition {
        constructor (properties:any);
        toJSON (stringify:true) : any;
        evaluate (almanac:Almanac, operatorMap:{[key:string] : string}) : boolean;
        booleanOperator () : string|undefined;
        isBooleanOperator () : boolean;
    }

    export class Almanac {
        constructor (factMap:any, runtimeFacts:any) ;
        addRuntimeFact (factId:string, value:object) : void;
        factValue (factId:string, params:object, path:string) : Promise<object>;
    }
}
