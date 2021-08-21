export function normalisePath(originalPath: string, customDomainBasePath: string): string {
    const re = new RegExp(`/?${customDomainBasePath}`, 'i');
    if (customDomainBasePath) {
        return originalPath.replace(re, '')
    }
    return originalPath
}
