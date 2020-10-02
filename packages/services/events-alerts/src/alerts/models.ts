export interface RawAlert {
    version: { N: string};

    time: { S: string};

    targets?: {
        M: {
            email: {
                // multiple email targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            address: { S: string }
                        }
                    }
                ],
                // single email target is v1.0
                M?: {
                    address: { S: string }
                }
            },
            sms: {
                // multiple sms targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            phoneNumber: { S: string }
                        }
                    }
                ],
                // single sms target is v1.0
                M?: {
                    phoneNumber: { S: string }
                }
            },
            mqtt: {
                // multiple mqtt targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            topic: { S: string }
                        }
                    }
                ],
                // single mqtt target is v1.0
                M?: {
                    topic: { S: string }
                }
            },
            dynamodb: {
                // multiple dynamodb targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            tableName: { S: string },
                            attributeMapping: {
                                M: {
                                    [key: string]: { S: string};
                                }
                            }
                        }
                    }
                ],
                // single dynamodb target is v1.0
                M?: {
                    tableName: { S: string },
                    attributeMapping: {
                        M: {
                            [key: string]: { S: string};
                        }
                    }
                }
            },
            push_gcm: {
                // multiple push_gcm targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            platformEndpointArn: { S: string }
                        }
                    }
                ],
                // single push_gcm target is v1.0
                M?: {
                    platformEndpointArn: { S: string }
                }
            },
            push_adm: {
                // multiple push_adm targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            platformEndpointArn: { S: string }
                        }
                    }
                ],
                // single push_adm target is v1.0
                M?: {
                    platformEndpointArn: { S: string }
                }
            },
            push_apns: {
                // multiple push_apns targets is supported in v2.0 and above
                L?: [
                    {
                        M: {
                            platformEndpointArn: { S: string }
                        }
                    }
                ],
                // single push_apns target is v1.0
                M?: {
                    platformEndpointArn: { S: string }
                }
            }
        }
    };

    snsTopicArn: { S: string};

    eventId: { S: string};
    eventName: { S: string};

    userId: { S: string};

    templatePropertiesData: {
        M: {
            [key: string]: {
                S?: string;
                N?: number;
            };
        }
    };
}

export interface AssembledAlert {
    version: number;
    time: string;
    targets?: TargetItems;
    snsTopicArn?: string;
    eventId: string;
    eventName: string;
    userId: string;
    templatePropertiesData?: {
        [key: string]: string | number | boolean
    };
}

export interface TargetItems {
    email?: EmailTargetItem[];
    sms?: SMSTargetItem[];
    mqtt?: MQTTTargetItem[];
    dynamodb?: DynamodDBTargetItem[];
    push_gcm?: PushTargetItem[];
    push_adm?: PushTargetItem[];
    push_apns?: PushTargetItem[];
}

export interface EmailTargetItem {
    address: string;
}

export interface SMSTargetItem  {
    phoneNumber: string;
}

export interface MQTTTargetItem {
    topic: string;
}

export interface DynamodDBTargetItem {
    tableName:string;
    attributeMapping: { [key: string] : string};
}

export interface PushTargetItem {
    platformEndpointArn? : string;
}
