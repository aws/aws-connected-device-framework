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
export const TYPES = {

    RenewerService: Symbol.for('RenewerService'),
    ProcessorService: Symbol.for('ProcessorService'),
    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),
    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>'),
    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    CertificatesDao: Symbol.for('CertificatesDao'),
    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>')
};
