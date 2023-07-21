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
// import { logger } from './utils/logger';

/**
 * APIGWAuthPolicyBuilder receives a set of allowed and denied methods and generates a valid
 * AWS policy for the API Gateway authorizer. The constructor receives the calling
 * user principal, the AWS account ID of the API owner, and an apiOptions object.
 * The apiOptions can contain an API Gateway RestApi Id, a region for the RestApi, and a
 * stage that calls should be allowed/denied for. For example
 * {
 *   restApiId: 'xxxxxxxxxx',
 *   region: 'us-east-1',
 *   stage: 'dev'
 * }
 *
 * const testPolicy = new AuthPolicy('[principal user identifier]', '[AWS account id]', apiOptions);
 * testPolicy.allowMethod('GET', '/users/username');
 * testPolicy.denyMethod('POST', '/pets');
 * context.succeed(testPolicy.build());
 *
 * @class APIGWAuthPolicyBuilder
 */
export class APIGWAuthPolicyBuilder {
    private readonly awsAccountId: string;
    private readonly principalId: string;

    // The policy version used for the evaluation. This should always be '2012-10-17'
    private readonly version = '2012-10-17';

    private readonly restApiId: string = '*';
    private readonly region: string = '*';
    private readonly stage: string = '*';

    // The regular expression used to validate resource paths for the policy
    private readonly pathRegex = new RegExp('^[/.a-zA-Z0-9-*]+$');

    // these are the internal lists of allowed and denied methods. These are lists
    // of objects and each object has 2 properties: A resource ARN and a nullable
    // conditions statement.
    // the build method processes these lists and generates the approriate
    // statements for the final policy
    private allowMethods: Method[] = [];
    private denyMethods: Method[] = [];

    /**
     * Constructor
     * @param principal The principal used for the policy, this should be a unique identifier for the end user.
     * @param awsAccountId The AWS account id the policy will be generated for.
     * @param apiOptions
     */
    constructor(principal: string, awsAccountId: string, apiOptions: ApiOptions) {
        if (!principal) {
            throw new Error('principal is required');
        }
        if (!awsAccountId) {
            throw new Error('awsAccountId is required');
        }
        this.principalId = principal;
        this.awsAccountId = awsAccountId;
        if (apiOptions && apiOptions.apiId) {
            this.restApiId = apiOptions.apiId;
        }
        if (apiOptions && apiOptions.region) {
            this.region = apiOptions.region;
        }
        if (apiOptions && apiOptions.stage) {
            this.stage = apiOptions.stage;
        }
    }

    /**
     * Adds a method to the internal lists of allowed or denied methods. Each object in
     * the internal list contains a resource ARN and a condition statement. The condition
     * statement can be null.
     *
     * @method addMethod
     * @param {PolicyStatementEffect} effect The effect for the policy. This can only be 'Allow' or 'Deny'.
     * @param {HttpVerb} verb The HTTP verb for the method, this should ideally come from the
     *                 HttpVerb object to avoid spelling mistakes
     * @param {String} resource The resource path. For example '/pets'
     * @param {Object} conditions The conditions object in the format specified by the AWS docs.
     * @return {void}
     */
    private addMethod(
        effect: PolicyStatementEffect,
        verb: HttpVerb,
        resource: string,
        condition?: Condition
    ) {
        if (!this.pathRegex.test(resource)) {
            throw new Error(
                'Invalid resource path: ' + resource + '. Path should match ' + this.pathRegex
            );
        }

        let cleanedResource = resource;
        if (resource.substring(0, 1) === '/') {
            cleanedResource = resource.substring(1, resource.length);
        }
        const resourceArn =
            'arn:aws:execute-api:' +
            this.region +
            ':' +
            this.awsAccountId +
            ':' +
            this.restApiId +
            '/' +
            this.stage +
            '/' +
            verb +
            '/' +
            cleanedResource;

        if (effect.toLowerCase() === 'allow') {
            this.allowMethods.push({
                resourceArn,
                condition,
            });
        } else if (effect.toLowerCase() === 'deny') {
            this.denyMethods.push({
                resourceArn,
                condition,
            });
        }
    }

    /**
     * Returns an empty statement object prepopulated with the correct action and the
     * desired effect.
     *
     * @method getEmptyStatement
     * @param {PolicyStatementEffect} effect The effect of the statement, this can be 'Allow' or 'Deny'
     * @return {Object} An empty statement object with the Action, Effect, and Resource
     *                  properties prepopulated.
     */
    private getEmptyStatement(effect: PolicyStatementEffect): Statement {
        const statementEffect =
            effect.substring(0, 1).toUpperCase() +
            effect.substring(1, effect.length).toLowerCase();
        const statement: Statement = {
            Action: 'execute-api:Invoke',
            Effect: statementEffect,
            Resource: [],
        };

        return statement;
    }

    /**
     * This function loops over an array of objects containing a resourceArn and
     * conditions statement and generates the array of statements for the policy.
     *
     * @method getStatementsForEffect
     * @param {PolicyStatementEffect} effect The desired effect. This can be 'Allow' or 'Deny'
     * @param {Array} methods An array of method objects containing the ARN of the resource
     *                and the conditions for the policy
     * @return {Array} an array of formatted statements for the policy.
     */
    private getStatementsForEffect(effect: PolicyStatementEffect, methods: Method[]): Statement[] {
        const statements = [];

        if (methods.length > 0) {
            const statement = this.getEmptyStatement(effect);

            for (const curMethod of methods) {
                if (curMethod.condition === undefined) {
                    statement.Resource.push(curMethod.resourceArn);
                } else {
                    const conditionalStatement = this.getEmptyStatement(effect);
                    conditionalStatement.Resource.push(curMethod.resourceArn);
                    conditionalStatement.Condition = curMethod.condition;
                    statements.push(conditionalStatement);
                }
            }

            if (statement.Resource !== null && statement.Resource.length > 0) {
                statements.push(statement);
            }
        }

        return statements;
    }

    /**
     * Adds an allow '*' statement to the policy.
     *
     * @method allowAllMethods
     */
    allowAllMethods(): void {
        this.addMethod('allow', '*', '*');
    }

    /**
     * Adds a deny '*' statement to the policy.
     *
     * @method denyAllMethods
     */
    denyAllMethods(): void {
        this.addMethod('deny', '*', '*');
    }

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
     * methods for the policy
     *
     * @method allowMethod
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example '/pets'
     * @return {void}
     */
    allowMethod(verb: HttpVerb, resource: string): void {
        this.addMethod('allow', verb, resource);
    }

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of denied
     * methods for the policy
     *
     * @method denyMethod
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example '/pets'
     * @return {void}
     */
    denyMethod(verb: HttpVerb, resource: string): void {
        this.addMethod('deny', verb, resource);
    }

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of allowed
     * methods and includes a condition for the policy statement. More on AWS policy
     * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
     *
     * @method allowMethodWithConditions
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example '/pets'
     * @param {Object} The conditions object in the format specified by the AWS docs
     * @return {void}
     */
    allowMethodWithConditions(verb: HttpVerb, resource: string, conditions: Condition): void {
        this.addMethod('allow', verb, resource, conditions);
    }

    /**
     * Adds an API Gateway method (Http verb + Resource path) to the list of denied
     * methods and includes a condition for the policy statement. More on AWS policy
     * conditions here: http://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html#Condition
     *
     * @method denyMethodWithConditions
     * @param {String} The HTTP verb for the method, this should ideally come from the
     *                 AuthPolicy.HttpVerb object to avoid spelling mistakes
     * @param {string} The resource path. For example '/pets'
     * @param {Object} The conditions object in the format specified by the AWS docs
     * @return {void}
     */
    denyMethodWithConditions(verb: HttpVerb, resource: string, conditions: Condition): void {
        this.addMethod('deny', verb, resource, conditions);
    }

    /**
     * Generates the policy document based on the internal lists of allowed and denied
     * conditions. This will generate a policy with two main statements for the effect:
     * one statement for Allow and one statement for Deny.
     * Methods that includes conditions will have their own statement in the policy.
     *
     * @method build
     * @return {Object} The policy object that can be serialized to JSON.
     */
    build(): Policy {
        if (
            (!this.allowMethods || this.allowMethods.length === 0) &&
            (!this.denyMethods || this.denyMethods.length === 0)
        ) {
            throw new Error('No statements defined for the policy');
        }

        const policy: Policy = {
            principalId: this.principalId,
            policyDocument: {
                Version: this.version,
                Statement: [],
            },
        };
        if (this.allowMethods && this.allowMethods.length > 0) {
            const allowMethods = this.getStatementsForEffect('allow', this.allowMethods);
            policy.policyDocument.Statement = policy.policyDocument.Statement.concat(allowMethods);
        }
        if (this.denyMethods && this.denyMethods.length > 0) {
            const denyMethods = this.getStatementsForEffect('deny', this.denyMethods);
            policy.policyDocument.Statement = policy.policyDocument.Statement.concat(denyMethods);
        }

        return policy;
    }
}

/**
 * A set of existing HTTP verbs supported by API Gateway. This property is here
 * only to avoid spelling mistakes in the policy.
 *
 * @property HttpVerb
 * @type {Object}
 */
export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'DELETE' | 'OPTIONS' | '*';
export type PolicyStatementEffect = 'allow' | 'deny';

export interface Method {
    resourceArn: string;
    condition: Condition;
}

export interface Condition {
    [key: string]: {
        [key: string]: string;
    };
}

export interface ApiOptions {
    region: string;
    apiId: string;
    stage?: string;
}

export interface Statement {
    Action: string;
    Effect: string;
    Resource: string[];
    Condition?: Condition;
}

export interface Policy {
    principalId: string;
    policyDocument: {
        Version: string;
        Statement: Statement[];
    };
}
