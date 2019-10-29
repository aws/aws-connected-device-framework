import {logger} from '../utils/logger';
import * as als from 'async-local-storage';

export class Claims {
    paths:{[path:string] : ClaimAccess[]}= {};

    constructor(rawClaims:string[]) {

        logger.debug(`claims in: rawClaims:${rawClaims}`);

        if (rawClaims===undefined) {
            return;
        }

        for(const claim of rawClaims) {
            logger.debug(`claims claim:${JSON.stringify(claim)}`);
            const claim_items = claim.split(':');
            if (claim_items.length!==2) {
                logger.debug(`claims invalid split claim_items:${JSON.stringify(claim_items)}`);
                return;
            }
            const path = claim_items[0];
            const access:ClaimAccess[]=[];
            for(const x of claim_items[1] ) {
                if (x==='*') {
                    access.push(...[ClaimAccess.C, ClaimAccess.R, ClaimAccess.U, ClaimAccess.D]);
                } else {
                    access.push(ClaimAccess[x]);
                }
            }
            this.paths[path] = access;
        }
    }

    public isAuthorized(path:string, access:ClaimAccess): boolean {
        const allowed:ClaimAccess[] = this.paths[path];
        if (allowed===undefined) {
            return false;
        }
        return allowed.includes(access);
    }

    public listPaths(): string[] {
        return Object.keys(this.paths);
    }

    public hasAccessForPath(path:string, access:ClaimAccess): boolean {
        return (this.paths[path]!==undefined && this.paths[path].includes(access));
    }

    public static getInstance() : Claims {
        const claims = als.get('claims') as Claims;
        if (claims!==undefined) {
            return claims;
        } else {
            const noClaims:string[]= [];
            return new Claims(noClaims);
        }
    }
}

export enum ClaimAccess {
    C='C',
    R='R',
    U='U',
    D='D'
}
