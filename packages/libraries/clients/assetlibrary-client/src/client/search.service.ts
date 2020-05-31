import {ClientServiceBase} from './common.service';
import {SearchRequestModel, SearchResultsModel} from './search.model';
import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';

export interface SearchService {
    search(searchRequest:SearchRequestModel, offset?:number, count?:number, additionalHeaders?:RequestHeaders) : Promise<SearchResultsModel>;
}

@injectable()
export class SearchServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected searchRelativeUrl(): string {
        return '/search';
    }
}
