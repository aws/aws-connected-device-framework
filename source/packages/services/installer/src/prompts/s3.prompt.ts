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
import inquirer, { Question, ListQuestionOptions } from 'inquirer';
import inquirerS3 from 'inquirer-s3';

inquirer.registerPrompt('s3-object', inquirerS3);

export function chooseS3BucketPrompt(message: string, name: string, initial?: string): Question {
    return {
        message,
        type: 'input',
        name,
        default: initial,
        askAnswered: true,
        validate(answer: string) {
            if ((answer?.length ?? 0) === 0) {
                return `You must enter the name of an S3 bucket.`;
            }
            return true;
        },
    };
}

interface S3Question extends ListQuestionOptions {
    type: 's3-object';
    bucket: string;
    objectPrefix: string;
}

export function chooseS3ObjectPrompt(
    message: string,
    name: string,
    bucket: string,
    objectPrefix?: string,
): S3Question {
    return {
        message,
        type: 's3-object',
        name,
        bucket,
        objectPrefix,
        pageSize: 20,
        loop: false,
        askAnswered: true,
    };
}
