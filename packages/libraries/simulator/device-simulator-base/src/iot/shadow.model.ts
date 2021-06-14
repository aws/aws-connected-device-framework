export interface DeviceShadow<S,T,U> {
    /**
     *  Updates affect only the fields specified. Typically, you'll use either the desired or the reported property, but not both in the same request.
     */
    state: {
        /**
         * The desired state of the device. Apps can write to this portion of the document to update the state of a device directly without having to connect to it.
         */
        desired?: S;

        /**
         * The reported state of the device. Devices write to this portion of the document to report their new state. Apps read this portion of the document to determine the device's last-reported state.
         */
        reported?: T;

        /**
         * Delta state is a virtual type of state that contains the difference between the desired and reported states. Fields in the desired section that are not in the reported section are included in the delta. Fields that are in the reported section and not in the desired section are not included in the delta. The delta contains metadata, and its values are equal to the metadata in the desired field.
         */
        delta?: U;
    };

    /**
     *  Information about the data stored in the state section of the document. This includes timestamps, in Epoch time, for each attribute in the state section, which enables you to determine when they were updated.
     */
    metadata?: {
        desired: {
            [attribute: string] : {
                timestamp: number;
            }
        };
        reported: {
            [attribute: string] : {
                timestamp: number;
            }
        };
    };

    /**
     * Indicates when the message was sent by AWS IoT. By using the timestamp in the message and the timestamps for individual attributes in the desired or reported section, a device can determine a property's age, even if the device doesn't have an internal clock.
     */
    timestamp?: number;

    /**
     *  A string unique to the device that enables you to associate responses with requests in an MQTT environment.
     */
    clientToken?: string;

    /**
     *  The document version. Every time the document is updated, this version number is incremented. Used to ensure the version of the document being updated is the most recent.
     */
    version?: number;
}

export interface DeviceDelta<U> {
    state: U;
    metadata?: {
        [attribute: string] : {
            timestamp: number;
        }
    };
    timestamp?: number;
    clientToken?: string;
    version?: number;
}
