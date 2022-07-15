import { ModuleName } from "./modules";

export interface Answers {
  accountId?: string;
  dryRun?: boolean;
  customTags?: string;
  iotEndpoint?: string;
  iotCredentialEndpoint?: string;
  environment: string;
  region?: string;
  modules?: Modules;
  kms?: Kms;
  apigw?: Apigw;
  vpc?: Vpc;
  s3?: S3;
  eventBus?: EventBus;
  openSsl?: OpenSsl;
  deploymentHelper?: DeploymentHelper;
  assetLibraryExport?: AssetLibraryExport;
  assetLibrary?: AssetLibrary;
  assetLibraryHistory?: AssetLibraryHistory;
  authDeviceCert?: AuthDeviceCert;
  authJwt?: AuthJwt;
  bulkCerts?: BulkCerts;
  certificateActivator?: CertificateActivator;
  certificateVendor?: CertificateVendor;
  commands?: Commands;
  commandAndControl?: CommandAndControl;
  deviceMonitoring?: DeviceMonitoring;
  notifications?: Notifications;
  greengrass2InstallerConfigGenerators?: Greengrass2InstallerConfigGenerators;
  greengrass2Provisioning?: Greengrass2Provisioning;
  devicePatcher?: DevicePatcher;
  provisioning?: Provisioning;
  fleetSimulator?: FleetSimulator;
}

export interface Kms {
  useExisting?: boolean;
  identifyBy?: "id" | "alias";
  alias?: string;
  id?: string;
}

export interface Modules {
  list?: ModuleName[];
  expandedMandatory?: ModuleName[];
  expandedIncludingOptional?: ModuleName[];
  confirm?: boolean;
  module?: string;
}

export type ApiAuthenticationType =
  | "None"
  | "Private"
  | "Cognito"
  | "LambdaRequest"
  | "LambdaToken"
  | "ApiKey"
  | "IAM";

export interface Apigw {
  type?: ApiAuthenticationType;
  cloudFormationTemplate?: string;
  cloudFormationSnippetsPath?: string;
  templateSnippetS3UriBase?: string;

  corsEnable?: boolean;
  corsOrigin?: string;

  cognitoUserPoolArn?: string;

  useExistingLambdaAuthorizer?: boolean;
  lambdaAuthorizerArn?: string;
}

export interface Vpc {
  useExisting?: boolean;
  id?: string;
  securityGroupId?: string;
  privateSubnetIds?: string;
  publicSubnetIds?: string;
  privateApiGatewayVpcEndpoint?: string;
}

export interface S3 {
  bucket?: string;
  optionalDeploymentBucket?: string;
  optionalDeploymentPrefix?: string;
}

export interface OpenSsl {
  deploy?: boolean;
  arn?: string;
}

export interface ServiceModuleAttributes {
  redeploy?: boolean;
  defaultAnswer?: boolean;
  loggingLevel?: string;
}

export interface ProvisionedConcurrencyModuleAttribues
  extends ServiceModuleAttributes {
  provisionedConcurrentExecutions?: number;
  enableAutoScaling?: boolean;
}
export interface RestServiceModuleAttribues extends ServiceModuleAttributes {
  enableCustomDomain?: boolean;
  customDomainBasePath?: string;
}

export interface AssetLibrary
  extends RestServiceModuleAttribues,
  ProvisionedConcurrencyModuleAttribues {
  mode?: "full" | "lite";
  neptuneDbInstanceType?: string;
  createDbReplicaInstance?: boolean;
  neptuneSnapshotIdentifier?: string;
  restoreFromSnapshot?: boolean;
  neptuneUrl?: string;
  // Application Configuration
  defaultAnswer?: boolean;
  defaultDevicesParentRelationName?: string;
  defaultDevicesParentPath?: string;
  defaultDevicesState?: string;
  defaultGroupsValidateAllowedParentPath?: string;
  enableDfeOptimization?: boolean;
  authorizationEnabled?: boolean;
}

export interface AssetLibraryExport extends ServiceModuleAttributes {
  maxConcurrency?: number;
  // Application configuration
  extractAttributes?: string;
  extractExpandComponents?: boolean;
  extractIncludeGroups?: boolean;
  s3ExportPrefix?: string;
  defaultBatchBy?: string;
  defaultBatchSize?: number;
  loadPath?: string;
}

export type AssetLibraryHistory = RestServiceModuleAttribues;

export type AuthDeviceCert = ServiceModuleAttributes;
export interface AuthJwt extends ServiceModuleAttributes {
  tokenIssuer?: string;
}

export interface BulkCerts extends RestServiceModuleAttribues {
  setCertificateDefaults?: boolean;
  setSupplier?: boolean;
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  locality?: string;
  stateName?: string;
  country?: string;
  emailAddress?: string;
  distinguishedNameIdentifier?: string;
  // Application Configuration
  defaultAnswer?: boolean;
  chunksize: number;
  expiryDays?: number;
  acmConcurrencyLimit?:number;
  suppliers?: CAAliases;
  caAlias?: string;
  caValue?: string;
}

export interface CAAliases {
  list?: string[];
  cas: CA[];
}

export interface CA {
  alias: string;
  value: string
}
export interface CertificateActivator extends ServiceModuleAttributes {
  provisioningFunctionName?: string;
  assetLibraryFunctionName?: string;
  // Application Configuration
  crlKey?: string;
}

export interface CertificateVendor extends ServiceModuleAttributes {
  commandsFunctionName?: string;
  assetLibraryFunctionName?: string;
  providingCSRs?: boolean;
  caCertificateId?: string;
  useDefaultPolicy?: boolean;
  rotatedCertificatePolicy?: string;
  // Application Configuration
  certificatesPrefix?: string;
  certificatesSuffix?: string;
  presignedUrlExpiryInSeconds?: number;
  rotateCertificatesThingGroup?: string;
  getSuccessTopic?: string;
  getFailureTopic?: string;
  getRootTopic?: string;
  ackSuccessTopic?: string;
  ackFailureTopic?: string;
  ackRootTopic?: string;
  deletePreviousCertificate?: boolean;
  deviceStatusSuccessKey?: string;
  deviceStatusSuccessValue?: string;
  certificateExpiryInDays?: number;
  registryMode?: "AssetLibrary" | "DeviceRegistry";
}

export interface Commands extends RestServiceModuleAttribues {
  provisioningFunctionName?: string;
  assetLibraryFunctionName?: string;
  // Application Configuration
  presignedUrlTopic?: string;
  addThingToGroupTemplate?: string;
  maxTargetsForJob?: number;
  commandArtifactsPrefix?: string;
  useAssetLibrary?: boolean;
}


export interface CommandAndControl extends RestServiceModuleAttribues {
  provisioningFunctionName?: string;
  assetLibraryFunctionName?: string;
  // Application Configuration
  deliveryMethodTopic?: string;
  awsIotShadowName?: string;
  addThingToGroupTemplate?: string;
  useAssetLibrary?: boolean;
}

export interface DeviceMonitoring extends ServiceModuleAttributes {
  assetLibraryFunctionName?: string;
}

export interface Notifications extends RestServiceModuleAttribues {
  useDax?: boolean;
  daxInstanceType?: string;
  notificationsTableName?: string;
  notificationsTableArn?: string;
  notificationsTableStreamArn?: string;
  configTableName?: string;
  configTableArn?: string;
  daxClusterEndpoint?: string;
  daxClusterArn?: string;
  queryCacheTTL?: number;
  itemCacheTTL?: number;
}

export interface Greengrass2InstallerConfigGenerators
  extends ServiceModuleAttributes {
  tokenExchangeRoleAlias?: string;
  // Application Configuration
  deviceRootPath?: string;
  deviceRootCAPath?: string;
  deviceCertificateFilePath?: string;
  devicePrivateKeyPath?: string;
  deviceClaimCertificatePath?: string;
  deviceClaimCertificatePrivateKeyPath?: string;
}

export interface Greengrass2Provisioning
  extends RestServiceModuleAttribues,
  ProvisionedConcurrencyModuleAttribues {
  provisioningFunctionName?: string;
  assetLibraryFunctionName?: string;
  installerConfigGenerators?: Record<string, string>;
  // Application Configuration
  promisesConcurrency?: number;
  corezBatchSize?: number;
  devicesBatchSize?: number;
  deploymentsBatchSize?: number;
  useAssetLibrary?: boolean;
  enablePublishEvents?: boolean;
}

export interface Provisioning extends RestServiceModuleAttribues {
  // Application Configuration
  deleteCertificates?: boolean;
  deletePolicies?: boolean;
  certificateExpiryInDays?: number;
  templateSuffix?: string;
  templatesPrefix?: string;
  bulkRequestsPrefix?: string;

  // ACM PCA specific
  pcaIntegrationEnabled?: boolean;
  pcaCrossAccountRoleArn?: string;
  pcaRegion?: string;
  setPcaAliases?: boolean;
  pcaAliases?: CAAliases;
  pcaAlias?: string;
  pcaArn?:string;
  setIotCaAliases?: boolean;
  iotCaAliases?: CAAliases;
  iotCaAlias?: string;
  iotCaArn?:string;
}

export interface FleetSimulator extends RestServiceModuleAttribues {
  jmeterRepoName?: string;
  snsTopic?: string;
  assetLibraryFunctionName?: string;
  // Application Configuration
  s3Prefix?: string;
  runnerDataDir?: string;
  runnerThreads?: number;
}

export interface DeploymentHelper {
  deploy?: boolean;
  lambdaArn?: string;
  vpcLambdaArn?: string;
}

export interface EventBus {
  useExisting?: boolean;
  arn?: string;
}

export type DevicePatcher = RestServiceModuleAttribues;
