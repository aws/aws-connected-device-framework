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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import {
    Category,
    CategoryEventsRequest,
    Events,
    ObjectEventsRequest,
    RequestHeaders,
} from './events.model';

export interface EventsService {
    listObjectEvents(
        req: ObjectEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listDeviceEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listGroupEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listDeviceTemplateEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listGroupTemplateEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listPolicyEvents(
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;

    listCategoryEvents(
        category: Category,
        req: CategoryEventsRequest,
        additionalHeaders?: RequestHeaders
    ): Promise<Events>;
}

@injectable()
export class EventsServiceBase {
    protected MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        Accept: this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE,
    };

    protected objectEventsRelativeUrl(category: string, objectId: string): string {
        return PathHelper.encodeUrl(category, objectId);
    }

    protected eventsRelativeUrl(category: string): string {
        return PathHelper.encodeUrl(category);
    }

    protected buildHeaders(additionalHeaders: RequestHeaders): RequestHeaders {
        let headers: RequestHeaders = Object.assign({}, this._headers);

        const customHeaders = process.env.ASSETLIBRARYHISTORY_HEADERS;
        if (customHeaders !== undefined) {
            try {
                const headersFromConfig: RequestHeaders = JSON.parse(
                    customHeaders
                ) as unknown as RequestHeaders;
                headers = { ...headers, ...headersFromConfig };
            } catch (err) {
                const wrappedErr = `Failed to parse configuration parameter ASSETLIBRARYHISTORY_HEADERS as JSON with error: ${err}`;
                console.log(wrappedErr);
                throw new Error(wrappedErr);
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = { ...headers, ...additionalHeaders };
        }

        const keys = Object.keys(headers);
        keys.forEach((k) => {
            if (headers[k] === undefined || headers[k] === null) {
                delete headers[k];
            }
        });

        return headers;
    }
}
