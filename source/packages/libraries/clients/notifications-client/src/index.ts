/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
export * from './client/common.model';
export * from './client/events.model';
export * from './client/events.service';
export * from './client/eventsources.model';
export * from './client/eventsources.service';
export * from './client/messages.model';
export * from './client/messages.service';
export * from './client/subscriptions.model';
export * from './client/subscriptions.service';
export * from './client/targets.model';
export * from './client/targets.service';
export { notificationsContainerModule } from './di/inversify.config';
export { NOTIFICATIONS_CLIENT_TYPES } from './di/types';
