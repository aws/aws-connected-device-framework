export interface CommonEvent {
    eventSourceId: string;
    principal: string;
    principalValue: string;
    attributes?: { [key: string] : string|boolean|number|string[]|number[] };
}
