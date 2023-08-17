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
export enum CertificateStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    REVOKED = 'REVOKED',
    PENDING_TRANSFER = 'PENDING_TRANSFER',
    REGISTER_INACTIVE = 'REGISTER_INACTIVE',
    PENDING_ACTIVATION = 'PENDING_ACTIVATION',
}

export interface RegistrationEvent {
    certificateId: string;
    caCertificateId: string;
    timestamp: number;
    certificateStatus: string;
    awsAccountId: string;
}

export interface CertificateRevocationList {
    revokedCertificates: CertificateRevocation[];
    lastUpdate: number;
}

export interface CertificateRevocation {
    certificateId: string;
    revokedOn: number;
    revokedReason: RevokedReason;
}

// CRL Revocation Reasons (RFC 5280)
export enum RevokedReason {
    unspecified = 0,
    keyCompromise = 1,
    cACompromise = 2,
    affiliationChanged = 3,
    superseded = 4,
    cessationOfOperation = 5,
    certificateHold = 6,
    // there is no 7
    removeFromCRL = 8,
    privilegeWithdrawn = 9,
    aACompromise = 10,
}
