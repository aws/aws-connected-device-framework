import { CommandResource } from '@aws-solutions/cdf-commandandcontrol-client';
import { JobsTestClient } from './jobsTestClient';
export interface CommandAndControlProvisioningWorld {
    lastCommand?: CommandResource;
    lastMessageId?: string;
    errStatus?: unknown;
    authToken?: string;

    // jobs
    jobsTestClients?: {
        [thingName: string]: JobsTestClient;
    };
}

export const world: CommandAndControlProvisioningWorld = {
    jobsTestClients: {},
};
