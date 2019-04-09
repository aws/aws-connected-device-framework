export interface CommonEvent {
    principal: string;
    attributes?: { [key: string] : string|boolean|number};
}
