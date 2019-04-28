
import { injectable, inject } from 'inversify';
import { logger } from '../utils/logger';
import { TYPES } from '../di/types';
import AWS = require('aws-sdk');

@injectable()
export class SNSTarget {

    private _sns: AWS.SNS;

    public constructor(
	    @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS
    ) {
        this._sns = snsFactory();
    }

    public async send(topicArn:string, messages:SNSMessages) : Promise<void> {
        logger.debug(`sns.target send: in: topicArn:${topicArn}, messages:${JSON.stringify(messages.toJson())}`);

        const params:AWS.SNS.Types.PublishInput = {
            TopicArn: topicArn,
            Message: JSON.stringify(messages.toJson()),
            MessageStructure: 'json'
        };

        try {
            await this._sns.publish(params).promise();
        } catch (err) {
            logger.error(`sns.target send: failed:${err}`);
        }

        logger.debug('sns.target send: exit:');

    }
}

export class SNSMessages {
    default:string='';
    email?:string;
    emailJson?: string;
    http?: string;
    https?: string;
    sqs?: string;

    public toJson():any {
        return {
            default: this.default,
            email: this.email,
            'email - json': this.emailJson,
            http: this.http,
            https: this.https,
            sqs: this.sqs
        };
    }

    public hasMessage() {
        return (this.default!==undefined) ||
            (this.email!==undefined) ||
            (this.emailJson!==undefined) ||
            (this.http!==undefined) ||
            (this.https!==undefined) ||
            (this.sqs!==undefined) ;
    }

}
