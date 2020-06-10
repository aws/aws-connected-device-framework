import {
    CommandListModel,
    CommandModel,
    ExecutionModel,
    ExecutionSummaryListModel,
    RequestHeaders,
} from './commands.model';
import config from 'config';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface CommandsService {
    createCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<string>;

    updateCommand(command: CommandModel, additionalHeaders?: RequestHeaders): Promise<void>;

    listCommands(additionalHeaders?: RequestHeaders): Promise<CommandListModel>;

    getCommand(commandId: string, additionalHeaders?: RequestHeaders): Promise<CommandModel>;

    uploadCommandFile(commandId: string, fileId: string, fileLocation: string, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteCommandFile(commandId: string, fileId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    listExecutions(commandId: string, additionalHeaders?: RequestHeaders): Promise<ExecutionSummaryListModel>;

    getExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel>;

    cancelExecution(commandId: string, thingName: string, additionalHeaders?: RequestHeaders): Promise<ExecutionModel>;
}

@injectable()
export class CommandsServiceBase {

    protected MIME_TYPE: string = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected commandsRelativeUrl() : string {
        return '/commands';
    }

    protected commandRelativeUrl(commandId:string) : string {
        return PathHelper.encodeUrl('commands', commandId);
    }

    protected commandFileRelativeUrl(commandId:string, fileId:string) : string {
        return PathHelper.encodeUrl('commands', commandId, 'files', fileId);
    }

    protected commandExecutionsRelativeUrl(commandId:string) : string {
        return PathHelper.encodeUrl('commands', commandId, 'executions');
    }

    protected commandThingExecutionsRelativeUrl(commandId:string, thingName:string) : string {
        return  PathHelper.encodeUrl('commands', commandId, 'executions', thingName);
    }

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = Object.assign({}, this._headers);

        if (config.has('commands.headers')) {
            const headersFromConfig:RequestHeaders = config.get('commands.headers') as RequestHeaders;
            if (headersFromConfig !== null && headersFromConfig !== undefined) {
                headers = {...headers, ...headersFromConfig};
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = {...headers, ...additionalHeaders};
        }

        const keys = Object.keys(headers);
        keys.forEach(k=> {
            if (headers[k]===undefined || headers[k]===null) {
                delete headers[k];
            }
        });

        return headers;
    }

}
