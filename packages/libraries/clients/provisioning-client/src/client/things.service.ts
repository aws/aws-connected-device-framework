/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * Provisioning implementation of CertificatesService *
 */
import { ProvisionThingResponse, ProvisionThingRequest, Thing, BulkProvisionThingsRequest, BulkProvisionThingsResponse, CertificateStatus } from './things.model';

export interface ThingsService {
    provisionThing(provisioningRequest: ProvisionThingRequest ): Promise<ProvisionThingResponse>;
    getThing(thingName: string ): Promise<Thing>;
    deleteThing(thingName: string ): Promise<void>;
    bulkProvisionThings(req: BulkProvisionThingsRequest ): Promise<BulkProvisionThingsResponse>;
    getBulkProvisionTask(taskId: string ): Promise<BulkProvisionThingsResponse>;
    updateThingCertificates(thingName:string, certificateStatus:CertificateStatus): Promise<void>;
}
