import { Dictionary } from '@aws-solutions/cdf-lambda-invoke';

export interface OrganizationManagerWorld {
    authToken?: string;
    errStatus?: unknown;
    lastOrganizationalUnitId?: string;
    lastAccountId?: string;
}

export const world: OrganizationManagerWorld = {};

export function getAdditionalHeaders(world: OrganizationManagerWorld): Dictionary {
    return {
        Authorization: world.authToken,
    };
}
