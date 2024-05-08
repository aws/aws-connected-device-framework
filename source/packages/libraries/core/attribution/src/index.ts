import { version } from '@awssolutions/cdf-version';

const ATTRIBUTION_ID = '99CF47E5-1F4E-4DB2-AB43-0E975D0C7888';

export function getCustomUserAgent(suffix: string): string {
    return `awssolutions/${ATTRIBUTION_ID}_${version}_${suffix}`;
}
