export class GreengrassSubscriptionResourceList {
    subscriptions: GreengrassSubscriptionResource[];
}

export class GreengrassSubscriptionDeleteResourceList {
    ids: string[];
}

export class GreengrassSubscriptionResource {
	id:string;
	source:string;
	subject:string;
	target:string;
}

export class GreengrassSubscriptionItem {
	id:string;
	source:string;
	subject:string;
	target:string;
}
