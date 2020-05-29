export class LambdaApiGatewayEventBuilder implements LambdaApiGatewayEvent {

    public resource: string;
    public path: string;
    public httpMethod: string;
    public headers: {[key:string]: string};
    public multiValueHeaders: {[key:string]: string[]};
    public queryStringParameters: {[key:string]: string};
    public multiValueQueryStringParameters: {[key:string]: string[]};
    public pathParameters: {[key:string]: string};
    public stageVariables: {[key:string]: string};
    public requestContext: any;
    public body: string;
    public isBase64Encoded: boolean;

    constructor(headers?: {[key:string]: string}) {
        this.headers = headers;
        this.resource = '/{proxy+}';
        // this.stageVariables = null;
        // this.multiValueQueryStringParameters = null;
        this.queryStringParameters = null;
        this.body = null;
        // this.requestContext = {};
        return this;
    }

    public setHeaders(headers: any) {
        this.headers = headers;
        return this;
    }

    public setBody(body: any) {
        this.body = JSON.stringify(body);
        return this;
    }

    public setMethod(method: string) {
        this.httpMethod = LambdaApiGatewayEventMethodTypes[method];
        return this;
    }

    public setPath(path: string) {
        this.path = path;
        this.pathParameters = {
            path
        };
        return this;
    }

}

export enum LambdaApiGatewayEventMethodTypes {
    GET='GET',
    PUT='PUT',
    POST='POST',
    DELETE='DELETE',
    PATCH='PATCH'
}

export interface LambdaApiGatewayEvent {
    resource: string;
    path: string;
    httpMethod: string;
    headers: {[key:string]: string};
    multiValueHeaders?: {[key:string]: string[]};
    queryStringParameters: {[key:string]: string} | null;
    multiValueQueryStringParameters?: {[key:string]: string[]} | null;
    pathParameters: {[key:string]: string};
    stageVariables?: {[key:string]: string} | null;
    requestContext?: any;
    body?: string | null;
    isBase64Encoded?: boolean;
}

export interface ApiGatewayInvokeResponsePayload {
    status: number;
    body: any;
    header: {[key:string]: string};
}

export class LambdaApiGatewayEventResponse implements ApiGatewayInvokeResponsePayload {
    public status: number;
    public body: any;
    private payload: any;
    public header: {[key:string]: string};

    constructor(payload: any) {
        this.payload = JSON.parse(payload.toString());
        this.status = this.payload.statusCode;
        this.body = JSON.parse(this.payload.body);
        this.header = this.payload.headers;
    }
}
