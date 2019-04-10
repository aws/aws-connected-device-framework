export interface CommonEvent {
    eventSourceId: string;
    principal: string;
    attributes?: { [key: string] : string|boolean|number|string[]|number[] };
}
