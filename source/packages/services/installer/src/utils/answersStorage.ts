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
import { LocalStorage } from "node-localstorage";
import { Answers } from "../models/answers";
import os from "os";
import path from "path";
import fs from "fs/promises";

const configurationRootPath = path.join(
  os.homedir(),
  "aws-connected-device-framework",
  "config"
);

export class AnswersStorage {
  private localStorage: LocalStorage;
  private environmentFileName: string;
  private localStoragePath: string;

  constructor(
    private accountId: string,
    private region: string,
    private environment: string
  ) {
    this.localStoragePath = path.join(
      configurationRootPath,
      this.accountId,
      this.region
    );

    this.localStorage = new LocalStorage(this.localStoragePath);
    this.environmentFileName = `${this.environment}.json`;
  }

  public save(answers: Answers): void {
    this.localStorage.setItem(
      this.environmentFileName,
      JSON.stringify(answers, null, 2)
    );
  }

  public getConfigurationFilePath(): string {
    return `${this.localStoragePath}/${this.environmentFileName}`;
  }

  public loadFromDefaultPath(): Answers {
    const answers: Answers = Object.assign(
      {},
      JSON.parse(this.localStorage[this.environmentFileName]),
      { environment: this.environment, region: this.region, accountId: this.accountId }
    );
    return answers;
  }

  public async loadFromFile(configLocation: string): Promise<Answers> {
    const configOnDisk = await fs.readFile(configLocation, "utf8");
    const answers: Answers = Object.assign({}, JSON.parse(configOnDisk), {
      accountId: this.accountId,
      region: this.region,
      environment: this.environment,
    });
    return answers;
  }
}
