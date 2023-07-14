import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import aws4 from 'aws4';
import { Plugin, SuperAgentRequest } from 'superagent';
import url from 'url';

const APIGW_SERVICE = 'execute-api';

export const signClientRequest = async (): Promise<Plugin> => {
    const provider = fromNodeProviderChain();
    const credentials = await provider();

    return (request: SuperAgentRequest): SuperAgentRequest => {
        if (credentials.sessionToken) {
            request.set({ 'X-Amz-Security-Token': credentials.sessionToken });
        }

        const requestAny: any = request;

        let data = requestAny._data;
        if (data && Object.keys(data).length) {
            data = JSON.stringify(data);
        } else {
            // it appears that empty object data payloads causes some CDF endpoints to hang,
            // so we remove them
            requestAny._data = undefined;
            data = '';
        }

        const parsedUrl = url.parse(request.url, true);
        const signedOptions = aws4.sign(
            {
                host: parsedUrl.host,
                method: request.method,
                path: parsedUrl.path,
                body: data,
                service: APIGW_SERVICE,
                region: process.env.AWS_REGION,
                headers: requestAny.header,
            },
            credentials,
        );

        request.set(signedOptions.headers);
        return request;
    };
};
