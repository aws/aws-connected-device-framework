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
