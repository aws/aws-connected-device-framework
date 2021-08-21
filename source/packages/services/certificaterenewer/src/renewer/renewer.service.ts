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
import {inject, injectable} from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {
    AuditNextPageRequest,
    BatchType,
    CertificateList,
    CertRequest,
    DeviceNextPageRequest,
    NotificationEvent,
    SqsRequest,
    SqsRequestList
} from './renewer.models';
import AWS = require('aws-sdk');

@injectable()
export class RenewerService {
    private iot: AWS.Iot;
    private sqs: AWS.SQS;
    private deviceCertsExpiringCheckName = 'DEVICE_CERTIFICATE_EXPIRING_CHECK';
    private defaultMaxBatchSize = 10;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject('sqs.processingQueue.queueUrl') private sqsQueueUrl: string,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS) {
        this.iot = iotFactory();
        this.sqs = sqsFactory();
    }

    public async processNotification(notification:NotificationEvent): Promise<void> {
        logger.debug(`RenewerService - notification:${JSON.stringify(notification)}`);
        try {
            const num_non_compliant_checks = notification.nonCompliantChecksCount;
            logger.debug(`Total Number of compliant : ${num_non_compliant_checks.toString()}`);
            if(Number(num_non_compliant_checks) > 0) {
                for(const auditDetail of notification.auditDetails) {
                    logger.debug(`Parse Audit Detail: ${JSON.stringify(auditDetail)} `);
                    if (auditDetail.checkName === this.deviceCertsExpiringCheckName && Number(auditDetail.nonCompliantResourcesCount) > 0) {
                        // Iterate through the Audit Findings to populate the list of expired certificates.
                        const listAuditFindingsRequest:AWS.Iot.Types.ListAuditFindingsRequest = {
                            checkName:this.deviceCertsExpiringCheckName, taskId:notification.taskId, maxResults:this.defaultMaxBatchSize
                        };
                        await this.processAuditFindings(listAuditFindingsRequest);
                    }
                }
            }
            logger.debug(`auditDetails : ${JSON.stringify(notification['auditDetails'])}`);
        } catch(e) {
            logger.error(`Error occurred while parsing the audit details : ${JSON.stringify(e)}`);
            throw Error('Error occurred while parsing the audit details');
        }
    }

    private async processAuditFindings(listAuditFindingsRequest:AWS.Iot.Types.ListAuditFindingsRequest): Promise<void> {
        try {
            const certList:CertificateList = {batchType:BatchType.EXPIRINGCERTIFICATE, certRequests:[] };
            const certRequests:CertRequest[]=[];
            logger.debug(`ListAuditFindingsRequest : ${JSON.stringify(listAuditFindingsRequest)}`);
            const listAuditFindingsResponse:AWS.Iot.ListAuditFindingsResponse = await this.iot.listAuditFindings(listAuditFindingsRequest).promise();
            console.log(`ListAuditFindingsResponse : ${JSON.stringify(listAuditFindingsResponse)}`);
            const auditFindings:AWS.Iot.AuditFindings | undefined = listAuditFindingsResponse.findings;
            if(auditFindings !== undefined) {
                for (const finding of auditFindings) {
                    console.log(finding);
                    const resource:AWS.Iot.ResourceIdentifier | undefined = finding.nonCompliantResource?.resourceIdentifier;
                    if(resource !== undefined) {
                        const expiringCertificateArn = await this.getExpiringCertificateArn(resource.deviceCertificateId);
                        certRequests.push(<CertRequest>{certificateArn: expiringCertificateArn});
                    }
                }
                certList.certRequests = certRequests;
                await this.sendMessageToQueueForProcessing(certList, this.sqsQueueUrl);
            }
            if(listAuditFindingsResponse.nextToken) {
                // Send Next Page for processing message to Next Page Processing.
                const auditNextPageRequest:AuditNextPageRequest = {
                    checkName:this.deviceCertsExpiringCheckName, nextToken:listAuditFindingsResponse.nextToken,
                    taskId:listAuditFindingsRequest.taskId, maxResults:listAuditFindingsRequest.maxResults,
                    batchType: BatchType.NEXTAUDITPAGE
                };
                await this.sendMessageToQueueForProcessing(auditNextPageRequest, this.sqsQueueUrl);
            }
        } catch(e) {
            logger.warn(`Error occurred while parsing the audit details : ${JSON.stringify(e)}`);
        }
    }

    private async sendMessageToQueueForProcessing(eventData:unknown, queueUrl:string): Promise<void> {
        logger.debug(`SQS MessageBody : ${JSON.stringify(eventData)}`);
        logger.debug(`SQS QueueUrl: ${queueUrl}`);
        const sqsRequest: AWS.SQS.SendMessageRequest = {
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(eventData)
        };
        await this.sqs.sendMessage(sqsRequest).promise();
    }

    public async processNextAuditPage(request:AuditNextPageRequest): Promise<void> {
        const listAuditFindingsRequest:AWS.Iot.Types.ListAuditFindingsRequest = {
            checkName:request.checkName, taskId:request.taskId, maxResults:request.maxResults, nextToken:request.nextToken
        };
        await this.processAuditFindings(listAuditFindingsRequest);
    }

    public async getExpiringCertificateArn(expiringCertificateId:string): Promise<string> {
        let expiringCertificateArn = '';
        try {
            logger.debug(`Expiring CertificateId: ${expiringCertificateId}`);
            const describeCertificateRequest:AWS.Iot.DescribeCertificateRequest = {certificateId:expiringCertificateId};
            const response: AWS.Iot.DescribeCertificateResponse = await this.iot.describeCertificate(describeCertificateRequest).promise();
            expiringCertificateArn = response.certificateDescription.certificateArn;
            logger.debug(`expiringCertificateArn: ${expiringCertificateArn}`);
            return expiringCertificateArn;
        } catch(e) {
            logger.warn(`Error occurred while getting CertificateArn : ${JSON.stringify(e)}`);
            throw Error('Error occurred while getting CertificateArn');
        }
    }

    public async processExpiringCertificate(listPrincipalThingsRequest: AWS.Iot.ListPrincipalThingsRequest): Promise<void> {
        try {
            const sqsRequestList:SqsRequestList = {batchType:BatchType.READYPROCESSING, sqsRequests:[] };
            const sqsRequests:SqsRequest[]=[];
            const response: AWS.Iot.ListPrincipalThingsResponse = await this.iot.listPrincipalThings(listPrincipalThingsRequest).promise();
            const thingNames:AWS.Iot.ThingNameList = response.things;
            for(const deviceName of thingNames) {
                sqsRequests.push(<SqsRequest>{thingName: deviceName, certificateArn: listPrincipalThingsRequest.principal});
            }
            sqsRequestList.sqsRequests = sqsRequests;
            console.log(`sqsRequestList : ${JSON.stringify(sqsRequestList)}`);
            await this.sendMessageToQueueForProcessing(sqsRequestList, this.sqsQueueUrl);

            if (response.nextToken) {
                const deviceNextPageRequest:DeviceNextPageRequest = {
                    principal: listPrincipalThingsRequest.principal, maxResults: listPrincipalThingsRequest.maxResults,
                    nextToken: response.nextToken, batchType: BatchType.NEXTDEVICEPAGE
                };
                await this.sendMessageToQueueForProcessing(deviceNextPageRequest, this.sqsQueueUrl);
            }
        } catch(e) {
            logger.warn(`Error occurred while listing the principal things : ${JSON.stringify(e)}`);
            throw Error('Error occurred while listing the principal things');
        }
    }

    public async processNextDevicePage(request:DeviceNextPageRequest): Promise<void> {
        const listPrincipalThingsRequest:AWS.Iot.ListPrincipalThingsRequest = {
            principal:request.principal, maxResults:request.maxResults, nextToken:request.nextToken
        };
        await this.processExpiringCertificate(listPrincipalThingsRequest);
    }

    public async processNextExpiringCertificate(certificateList:CertificateList): Promise<void> {
        for (const cert of certificateList.certRequests) {
            const listPrincipalThingsRequest:AWS.Iot.ListPrincipalThingsRequest = {
                principal:cert.certificateArn, maxResults:this.defaultMaxBatchSize
            };
            await this.processExpiringCertificate(listPrincipalThingsRequest);
        }
    }
}
