# Private API Gateway Support

## Introduction

Each service that exposes a REST API can be configured to be deployed as a private API Gateway endpoint thus preventing the service from being accessed publicly.

## Implementation

API Gateway private endpoints are made possible via [AWS PrivateLink](https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-privatelink.html) interface VPC endpoints. Interface endpoints work by creating elastic network interfaces in subnets that are defined inside a VPC. Those network interfaces then provide access to services running in other VPCs, or to AWS services such as API Gateway. When configuring an interface endpoint, you specify which service traffic should go through them. When using private DNS, all traffic to that service is directed to the interface endpoint instead of through a default route, such as through a NAT gateway or public IP address. 

API Gateway as a fully managed service runs its infrastructure in its own VPCs. When you interface with API Gateway publicly accessible endpoints, it is done through public networks. When they’re configured as private, the public networks are not made available to route your API. Instead, your API can only be accessed using the interface endpoints that you have configured.

The VPC used to contain the private services is the same VPC that CDF Asset Library is deployed into.  Based on configuration this could be an existing VPC, or a new VPC created automatically as part of the CDF deployment.  

When a CDF service is configured as private, the following happens:
- A VPC endpoint in each of the available subnets within the VPC is created
- A new security group authorizing access to the CDF endpoints is created
- A resource policy is created to allow access to the CDF endpoints within the VPC
- The deployed API Gateways for the configured private services are set to private endpoint.


