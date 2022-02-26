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

export class ConfigBuilder {
  public config: string;

  constructor() {
    this.config = '';
    return this;
  }

  public add(key: string, value: string | boolean | number | undefined): ConfigBuilder {
    // if there is no value specified, we will not set the environment variables
    if (value === undefined)
      return this;

    if (this.config === '')
      this.config = `${key}=${value}`;
    else
      this.config = `${this.config}\r\n${key}=${value}`;

    return this;
  }
}