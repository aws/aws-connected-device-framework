export function validateAcmPcaArn(arn: string): boolean | string {
    return /^arn:aws:acm-pca:\w+(?:-\w+)+:\d{12}:certificate-authority\/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+$/.test(
        arn
    )
        ? true
        : 'Value is not a valid ACM PCA Arn';
}

export function validateAwsIotCaID(arn: string): boolean | string {
    return /^[A-Za-z0-9]+(?:[A-Za-z0-9]+)+$/.test(arn)
        ? true
        : 'Value is not a valid AWS IoT CA Arn';
}

export function validateAwsIAMRoleArn(arn: string): boolean | string {
    return /^arn:aws:iam::\d{12}:role\/[A-Za-z0-9]+(?:[A-Za-z0-9_-]+)+$/.test(arn)
        ? true
        : 'Value is not a valid IAM Role Arn';
}

export function validateAwsIotCaArn(arn: string): boolean | string {
    return /^arn:aws:iot:\w+(?:-\w+)+:\d{12}:cacert\/[A-Za-z0-9]+(?:[A-Za-z0-9]+)+$/.test(arn)
        ? true
        : 'Value is not a valid AWS IoT CA Arn';
}
