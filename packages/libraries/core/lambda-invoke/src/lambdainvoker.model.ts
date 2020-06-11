export class LambdaApiGatewayEventBuilder implements LambdaApiGatewayEvent {

    public resource: string;
    public path: string;
    public httpMethod: LambdaApiGatewayEventMethodTypes;
    public headers: Dictionary;
    public multiValueHeaders: DictionaryArray;
    public queryStringParameters: Dictionary;
    public multiValueQueryStringParameters: DictionaryArray;
    public pathParameters: Dictionary;
    public stageVariables: Dictionary;
    public requestContext: any;
    public body: string;
    public isBase64Encoded: boolean;

    constructor() {
        this.headers = null;
        this.resource = '/{proxy+}';
        this.queryStringParameters = null;
        this.multiValueQueryStringParameters = null;
        this.body = null;
        return this;
    }

    public setHeaders(headers: Dictionary) {
        this.headers = headers;
        return this;
    }

    public setQueryStringParameters(value: Dictionary) {
        this.queryStringParameters = value;
        return this;
    }

    public setMultiValueQueryStringParameters(value: DictionaryArray) {
        this.multiValueQueryStringParameters = value;
        return this;
    }

    public setBody(body: any) {
        this.body = JSON.stringify(body);
        return this;
    }

    public setMethod(method: LambdaApiGatewayEventMethodTypes) {
        this.httpMethod = method;
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

export type LambdaApiGatewayEventMethodTypes =
    | 'GET'
    | 'PUT'
    | 'POST'
    | 'DELETE'
    | 'PATCH';

export interface LambdaApiGatewayEvent {
    resource: string;
    path: string;
    httpMethod: LambdaApiGatewayEventMethodTypes;
    headers: Dictionary;
    multiValueHeaders?: {[key:string]: string[]};
    queryStringParameters: Dictionary | null;
    multiValueQueryStringParameters?: {[key:string]: string[]} | null;
    pathParameters: Dictionary;
    stageVariables?: Dictionary | null;
    requestContext?: any;
    body?: string | null;
    isBase64Encoded?: boolean;
}

export interface ApiGatewayInvokeResponsePayload {
    status: number;
    body: any;
    header: Dictionary;
}

export class LambdaApiGatewayEventResponse implements ApiGatewayInvokeResponsePayload {
    public status: number;
    public body: any;
    private payload: any;
    public header: Dictionary;

    constructor(payload: any) {
        this.payload = JSON.parse(payload.toString());
        this.status = this.payload.statusCode;
        try {
            this.body = JSON.parse(this.payload.body);
        } catch (error) {
            if (error instanceof SyntaxError) {
                // silently ignore as not all successful requests, such as a 204, return a json body
            } else {
                throw error;
            }
        }
        this.header = this.payload.headers;
    }
}

export class Dictionary {
    [key:string]: string;
}
export class DictionaryArray {
    [key:string]: string[];
}
