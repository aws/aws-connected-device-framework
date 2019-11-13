export type SupportedVersionConfig = {[subType:string]:string[]}[];

const MIME_TYPE_PREFIX = 'application/vnd.aws-cdf-v';

export function asArray(supportedVersions:SupportedVersionConfig ): string[] {
  const mimeTypes:string[]= [];
  supportedVersions.forEach(sv=> {
    Object.keys(sv).forEach(subType=> {
      sv[subType].forEach(version=> {
        const mimeType = `${MIME_TYPE_PREFIX}${version}${CdfVersionType[subType]}`;
        mimeTypes.push(mimeType);
      });
    });
  });
  console.log(`Supported versions: ${JSON.stringify(mimeTypes)}`);
  return mimeTypes;
}

export function supportsAtLeastVersion(accept:string, subType:CdfVersionType, version?:number, ): boolean {
  if(subType===CdfVersionType.json && accept.endsWith(CdfVersionType.hal)) {
    // explicit check, as we cannot do a simple endswith check due to duplicated types ending with +json
    return false;
  }
  if (!accept.endsWith(subType)) {
    return false;
  }
  const acceptsVersion = Number(accept.replace(MIME_TYPE_PREFIX, '').replace(subType, ''));
  return acceptsVersion >= version;

}

export enum CdfVersionType {
  json = '+json',
  hal = 'hal+json'
}

export const DEFAULT_MIME_TYPE=`${MIME_TYPE_PREFIX}1.0${CdfVersionType.json}`;
