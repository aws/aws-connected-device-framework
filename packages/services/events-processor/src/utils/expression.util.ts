import * as Reflect from 'reflect';

export class ExpressionParser {
    public expressions: string[];

    constructor(expressions: string[]) {
        this.expressions = expressions;
    }

    // Extract all properties of a string expression
    public extractKeys(): string[] {
        const propertiesMap = {};
        this.expressions.forEach(expression => {
            this.parseExpression(expression).forEach(k => {
                propertiesMap[k] = k;
            });
        });
        return Object.keys(propertiesMap);
    }

    private parseExpression(expression: string): string[] {
        const ast = Reflect.parse(expression);
        const expTree = ast.body[0].expression;
        const keys: string[] = [];

        // Traverse through the tree and find all member expression nodes
        const _traverse = (node: any) => {
            // If the node type is member Expression add the name or value of the property
            if(node.type === 'MemberExpression') {
                keys.push(node.property.name || node.property.value);
            }

            // Recurse if there is a left node
            if (node.left) {
                _traverse(node.left);
            }

            // Recurse if there is a right node
            if(node.right) {
                _traverse(node.right);
            }
        };

        _traverse(expTree);
        return keys;
    }

}

export class ExpressionSanitizer {
    public rawExpression: string;
    public pattern: RegExp;
    constructor(rawExpressionTemplate: string) {
        this.rawExpression = rawExpressionTemplate;
        const defaultPattern = /\{\{\s*(.*?)\s*\}\}/g;
        this.pattern = defaultPattern;
    }

    public sanitize(): string[] {
        const sanitizedExpression: string[] = [];
        const regex = new RegExp(this.pattern);

        let match:any;

        do {
            match = regex.exec(this.rawExpression);

            if(match && match.length !== 0) {
                sanitizedExpression.push(match[1].replace(/=/g, ''));
            }

        } while (match !== null);

        return sanitizedExpression;
    }
}
