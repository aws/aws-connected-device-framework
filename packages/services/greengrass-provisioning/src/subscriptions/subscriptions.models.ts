export interface GreengrassSubscriptionResourceList {
    subscriptions: GreengrassSubscriptionResource[];
}

export interface GreengrassSubscriptionDeleteResourceList {
    ids: string[];
}

export interface GreengrassSubscriptionResource {
	id:string;
	source:string;
	subject:string;
	target:string;
}

export interface GreengrassSubscriptionItem {
	id:string;
	source:string;
	subject:string;
	target:string;
}
