/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const BULKCERTS_CLIENT_TYPES = {

    CertificatesTaskService: Symbol.for('BulkCertsClient_CertificatesTaskService'),
    CertificatesService: Symbol.for('BulkCertsClient_CertificatesService')

};
