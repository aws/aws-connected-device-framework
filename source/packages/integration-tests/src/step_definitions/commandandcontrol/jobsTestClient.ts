
import { iot, mqtt, iotjobs } from 'aws-iot-device-sdk-v2';

export class JobsTestClient {

  private connection: mqtt.MqttClientConnection;
  private jobsClient: iotjobs.IotJobsClient;
  private job: iotjobs.model.JobExecutionData;

  constructor(private thingName: string, private certPath: string, private keyPath: string, private caPath: string) {
    // console.log(`JobsTestClient: thingName: ${thingName}, certPath: ${certPath}, keyPath: ${keyPath}, caPath: ${caPath}`);
  }


  private buildConnection(): mqtt.MqttClientConnection {

    const endpoint: string = process.env.AWS_IOT_ENDPOINT;
    let config_builder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(this.certPath, this.keyPath);
    config_builder.with_certificate_authority_from_path(undefined, this.caPath);
    config_builder.with_clean_session(false);
    config_builder.with_client_id(this.thingName);
    config_builder.with_endpoint(endpoint);
    const c = config_builder.build();

    const client = new mqtt.MqttClient();
    return client.new_connection(c);
  }

  public async connect(): Promise<void> {
    this.connection = this.buildConnection();

    this.jobsClient = new iotjobs.IotJobsClient(this.connection);
    await this.connection.connect();
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }

  public async getNextJobDocument(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {

        await this.jobsClient.subscribeToDescribeJobExecutionAccepted({
          thingName: this.thingName,
          jobId: "$next"
        }, mqtt.QoS.AtLeastOnce,
          (error?: iotjobs.IotJobsError, response?: iotjobs.model.DescribeJobExecutionResponse) => {
            if (error) {
              console.log(`jobsClient.subscribeToDescribeJobExecutionAccepted: error: ${error}`);
              reject();
            } else {
              this.job = response.execution;
              resolve();
            }
        });

        await this.jobsClient.publishDescribeJobExecution({
          thingName: this.thingName,
          jobId: "$next"
        }, mqtt.QoS.AtLeastOnce);
      }
      catch (error) {
        console.log(`JobsTestClient: error: ${error}`);
        reject(error);
      }
    });
  }

  public async updateJobExecution(status: iotjobs.model.JobStatus, statusDetails?: { [key: string]: string }): Promise<void> {
    if (this.job === undefined) {
      throw new Error('NO_JOB');
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        await this.jobsClient.publishUpdateJobExecution({
          thingName: this.thingName,
          jobId: this.job.jobId,
          status,
          statusDetails: {
            correlationId: this.job.jobDocument['correlationId'],
            ...statusDetails
          }
        }, mqtt.QoS.AtLeastOnce);
        resolve();
      }
      catch (error) {
        reject(error);
      }
    });
  }
}