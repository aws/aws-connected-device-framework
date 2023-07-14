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
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { S3Utils } from './s3.util';

@injectable()
export class ExpressionParser {
    private pattern = new RegExp('{(.*?)}');
    private supportedTransformers: string[] = ['aws:s3:presign:'];

    constructor(@inject(TYPES.S3Utils) private s3Utils: S3Utils) {}

    public async eval(expression: string): Promise<string> {
        const match = this.pattern.exec(expression);

        if (match && match.length !== 0) {
            for (const transformer of this.supportedTransformers) {
                if (expression.includes(transformer)) {
                    switch (transformer) {
                        case 'aws:s3:presign:': {
                            const chunks = expression.split(transformer);
                            const parsedUrl = new URL(chunks[1]);

                            const bucketName = parsedUrl.hostname.split('.s3')[0];
                            const key = parsedUrl.pathname.slice(1);
                            const expiresInParam = parsedUrl.searchParams.get('expiresIn');
                            let expiresIn: number;

                            if (expiresInParam != null) {
                                expiresIn = parseInt(expiresInParam);
                            } else {
                                expiresIn = 3600;
                            }

                            expression = await this.s3Utils.generatePresignedUrl(
                                bucketName,
                                key,
                                expiresIn,
                            );
                            break;
                        }
                    }
                }
            }
        }

        return expression;
    }
}
