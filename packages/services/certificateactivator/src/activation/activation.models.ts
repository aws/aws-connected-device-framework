/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export enum CertificateStatus {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
	REVOKED = 'REVOKED',
	PENDING_TRANSFER = 'PENDING_TRANSFER',
	REGISTER_INACTIVE = 'REGISTER_INACTIVE',
	PENDING_ACTIVATION = 'PENDING_ACTIVATION'
}

export interface RegistrationEvent {
	certificateId: string;
	caCertificateId: string;
	timestamp: number;
	certificateStatus: string;
	awsAccountId: string;
	certificateRegistrationTimestamp: string;
}

export interface CertificateRevocationList {
	revokedCertificates: CertificateRevocation[];
	lastUpdate:number;
}

export interface CertificateRevocation {
	certificateId:string;
	revokedOn:number;
	revokedReason:RevokedReason;
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
	aACompromise = 10
}
