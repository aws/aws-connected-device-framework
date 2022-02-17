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

export interface NewTemplate {
	name:string;
	components: Component[];
	jobConfig?: JobConfig;
	deploymentPolicies?: DeploymentPolicy;
	enabled: boolean;
}
 export interface Template extends NewTemplate {
	version?: number;

	deployment?: {
		id: string;
		thingGroupName: string;
		jobId:string;
	}

	createdAt?: Date;
	updatedAt?: Date;
}

export interface Component {
	key: string;
    version: string;
	configurationUpdate?: {
		merge?: string;
		reset?: string[];
	};
	runWith?: {
		posixUser: string;
	};

}
export interface JobConfig {
	jobExecutionsRolloutConfig?: {
		exponentialRate: {
			baseRatePerMinute: number;
			incrementFactor: number;
			rateIncreaseCriteria: {
				numberOfNotifiedThings: number;
				numberOfSucceededThings: number;
			};
		};
		maximumPerMinute?: number;
	};
	abortConfig?: {
		criteriaList: [{
			failureType: string;
			action: AbortConfigFailureType;
			thresholdPercentage: number;
			minNumberOfExecutedThings: number;
		}];
	};
	timeoutConfig?: {
		inProgressTimeoutInMinutes: number;
	};
}

export interface DeploymentPolicy {
	failureHandlingPolicy: FailureHandlingPolicy;
	componentUpdatePolicy: {
		timeoutInSeconds: number;
		action: DeploymentPolicyAction;
	};
	configurationValidationPolicy: {
		timeoutInSeconds: number;
	}
}

export type AbortConfigFailureType = 'FAILED' | 'REJECTED' | 'TIMED_OUT' | 'ALL';
export type FailureHandlingPolicy = 'ROLLBACK' | 'DO_NOTHING';
export type DeploymentPolicyAction = 'NOTIFY_COMPONENTS' | 'SKIP_NOTIFY_COMPONENTS';
