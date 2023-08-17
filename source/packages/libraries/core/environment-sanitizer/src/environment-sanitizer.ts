const insecureKeys: string[] = ['AWS_SESSION_TOKEN', 'AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID'];
const REDACTED = '********';

/**
 * A function to sanitize process environments for logging
 * @param env The environment to be sanitized. This replaces values of AWS_SESSION_TOKEN, AWS_SECRET_ACCESS_KEY, and AWS_ACCESS_KEY_ID key values with "********"
 * @returns a copy of env that has been sanitized
 */
export function sanitized(env: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (insecureKeys.includes(key)) {
            out[key] = REDACTED;
        } else {
            out[key] = value;
        }
    }
    return out;
}
