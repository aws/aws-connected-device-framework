/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This eventSource code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { EventSourceDetailResource } from '../eventSource.models';

export interface EventSource  {

    create(model:EventSourceDetailResource) : Promise<void>;
    delete(eventSourceId:string) : Promise<void>;

}
