import execa from "execa";
import inquirer from "inquirer";
import { ListrTask } from "listr2";
import ow from "ow";
import path from "path";
import pkgDir from "pkg-dir";
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import { Answers } from "../../../models/answers";
import { InfrastructureModule, ModuleName } from "../../../models/modules";
import { deleteStack } from "../../../utils/cloudformation.util";

export class VpcInstaller implements InfrastructureModule {
  public readonly friendlyName = "VPC";
  public readonly name = "vpc";
  public readonly dependsOnMandatory: ModuleName[] = [];
  public readonly dependsOnOptional: ModuleName[] = ["apigw"];
  public readonly type = "INFRASTRUCTURE";

  private stackName: string;

  constructor(region: string) {
    this.stackName = `cdf-network-${region}`;
  }

  public async prompts(answers: Answers): Promise<Answers> {
    delete answers.vpc?.useExisting;

    answers = await inquirer.prompt(
      [
        {
          message:
            "Some of the modules selected may require a VPC. Use an existing VPC for these? If not, a new VPC will be created.",
          type: "confirm",
          name: "vpc.useExisting",
          default: answers.vpc?.useExisting ?? false,
          when(answers: Answers) {
            return (
              answers.modules.expandedIncludingOptional.includes("vpc") ||
              answers.apigw?.type === "Private" ||
              answers.assetLibrary?.mode == "full"
            );
          },
        },
        {
          message: "Enter existing VPC id:",
          type: "input",
          name: "vpc.id",
          default: answers.vpc?.id,
          askAnswered: true,
          when(answers: Answers) {
            return (
              (answers.vpc?.useExisting ?? false) &&
              (answers.modules.expandedIncludingOptional.includes("vpc") ||
                answers.apigw?.type === "Private" ||
                answers.assetLibrary?.mode == "full")
            );
          },
        },
        {
          message: "Enter existing security group id:",
          type: "input",
          name: "vpc.securityGroupId",
          default: answers.vpc?.securityGroupId,
          askAnswered: true,
          when(answers: Answers) {
            return (
              (answers.vpc?.useExisting ?? false) &&
              (answers.modules.expandedIncludingOptional.includes("vpc") ||
                answers.apigw?.type === "Private")
            );
          },
        },
        {
          message:
            "Enter existing private subnet ids (separated with a comma):",
          type: "input",
          name: "vpc.privateSubnetIds",
          default: answers.vpc?.privateSubnetIds,
          askAnswered: true,
          when(answers: Answers) {
            // TODO validate when needed
            return (
              (answers.vpc?.useExisting ?? false) &&
              (answers.modules.expandedIncludingOptional.includes("vpc") ||
                answers.apigw?.type === "Private")
            );
          },
        },
        {
          message: "Enter existing private API Gateway VPC endpoint:",
          type: "input",
          name: "vpc.privateApiGatewayVpcEndpoint",
          default: answers.vpc?.privateApiGatewayVpcEndpoint,
          askAnswered: true,
          when(answers: Answers) {
            // TODO validate when needed
            return (
              (answers.vpc?.useExisting ?? false) &&
              answers.modules.expandedIncludingOptional.includes("vpc")
            );
          },
        },
      ],
      answers
    );

    if ((answers.vpc?.useExisting ?? false) === false) {
      delete answers.vpc?.id;
      delete answers.vpc?.securityGroupId;
      delete answers.vpc?.privateSubnetIds;
      delete answers.vpc?.privateApiGatewayVpcEndpoint;
    }

    return answers;
  }

  public async install(answers: Answers): Promise<[Answers, ListrTask[]]> {
    ow(answers, ow.object.nonEmpty);

    const tasks: ListrTask[] = [];

    const installerPackageRoot = await pkgDir();
    const monorepoRoot = path.join(
      installerPackageRoot,
      "..",
      "..",
      "..",
      ".."
    );

    if (answers.vpc?.useExisting === false) {
      ow(answers.environment, ow.string.nonEmpty);
      ow(answers.region, ow.string.nonEmpty);

      const skipDeployment =
        answers.apigw?.type !== "Private" &&
        answers.assetLibrary?.mode !== "full" &&
        answers.notifications?.useDax !== true;

      tasks.push(
        {
          title: `Deploying stack '${this.stackName}'`,
          skip: skipDeployment,
          task: async () => {
            await execa(
              "aws",
              [
                "cloudformation",
                "deploy",
                "--template-file",
                "cfn-networking.yaml",
                "--stack-name",
                this.stackName,
                "--parameter-overrides",
                `Environment=${answers.environment}`,
                `ExistingVpcId=N/A`,
                `ExistingCDFSecurityGroupId=`,
                `ExistingPrivateSubnetIds=`,
                `ExistingPublicSubnetIds=`,
                `ExistingPrivateApiGatewayVPCEndpoint=`,
                `ExistingPrivateRouteTableIds=`,
                `EnableS3VpcEndpoint=${true}`,
                `EnableDynamoDBVpcEndpoint=${answers.notifications?.useDax ?? false
                }`,
                `EnablePrivateApiGatewayVPCEndpoint=${answers.apigw?.type === "Private" ? true : false
                }`,
                "--capabilities",
                "CAPABILITY_NAMED_IAM",
                "--no-fail-on-empty-changeset",
                "--region",
                answers.region,
              ],
              {
                cwd: path.join(
                  monorepoRoot,
                  "source",
                  "infrastructure",
                  "cloudformation"
                ),
              }
            );
          },
        },

        {
          title: `Retrieving network information from stack '${this.stackName}'`,
          skip: skipDeployment,
          task: async () => {
            const cloudFormation = new CloudFormationClient({
              region: answers.region,
            });
            const r = await cloudFormation.send(
              new DescribeStacksCommand({
                StackName: this.stackName,
              })
            );

            answers.vpc.id = r?.Stacks?.[0]?.Outputs?.find(
              (o) => o.OutputKey === "VpcId"
            )?.OutputValue;
            answers.vpc.securityGroupId = r?.Stacks?.[0]?.Outputs?.find(
              (o) => o.OutputKey === "CDFSecurityGroupId"
            )?.OutputValue;
            answers.vpc.privateSubnetIds = r?.Stacks?.[0]?.Outputs?.find(
              (o) => o.OutputKey === "PrivateSubnetIds"
            )?.OutputValue;
            answers.vpc.publicSubnetIds = r?.Stacks?.[0]?.Outputs?.find(
              (o) => o.OutputKey === "PublicSubnetIds"
            )?.OutputValue;
            answers.vpc.privateApiGatewayVpcEndpoint =
              r?.Stacks?.[0]?.Outputs?.find(
                (o) => o.OutputKey === "PrivateApiGatewayVPCEndpoint"
              )?.OutputValue;
          },
        }
      );
    }

    return [answers, tasks];
  }

  public async delete(answers: Answers): Promise<ListrTask[]> {
    const tasks: ListrTask[] = [];
    tasks.push({
      title: `Deleting stack '${this.stackName}'`,
      task: async () => {
        await deleteStack(this.stackName, answers.region);
      },
    });
    return tasks;
  }
}
