
export interface QueuedApiEvent {
  event: ApiGatewayEvent;
  context: LambdaContext;
}

export interface ApiGatewayEvent {
  resource: string;
  path: string;
  httpMethod: string;
  headers: {[key:string]: string};
  multiValueHeaders: {[key:string]: string[]};
  queryStringParameters: {[key:string]: string};
  multiValueQueryStringParameters: {[key:string]: string[]};
  pathParameters: {[key:string]: string};
  stageVariables: {[key:string]: string};
  requestContext: any;
  body: string;
  isBase64Encoded: boolean;
}

export interface LambdaContext {
    callbackWaitsForEmptyEventLoop: boolean;
    logGroupName: string;
    logStreamName: string;
    functionName: string;
    memoryLimitInMB: string;
    functionVersion: string;
    invokeid: string;
    awsRequestId: string;
    invokedFunctionArn: string;
}

export interface ApiGatewayInvokeResponsePayload {
  statusCode: number;
  body: string;
  headers: {[key:string]: string};
  isBase64Encoded: boolean;
}

// Example event seen by Lambda from API Gateway:

// {
//   "resource": "/{proxy+}",
//   "path": "/things",
//   "httpMethod": "POST",
//   "headers": {
//       "Accept": "application/vnd.aws-cdf-v1.0+json",
//       "Accept-Encoding": "gzip, deflate",
//       "CloudFront-Forwarded-Proto": "https",
//       "CloudFront-Is-Desktop-Viewer": "true",
//       "CloudFront-Is-Mobile-Viewer": "false",
//       "CloudFront-Is-SmartTV-Viewer": "false",
//       "CloudFront-Is-Tablet-Viewer": "false",
//       "CloudFront-Viewer-Country": "US",
//       "Content-Type": "application/vnd.aws-cdf-v1.0+json",
//       "Host": "573h9e2j81.execute-api.us-west-2.amazonaws.com",
//       "User-Agent": "node-superagent/3.8.3",
//       "Via": "1.1 76bce8bb4fbd102fc0b3aa2e41094b79.cloudfront.net (CloudFront)",
//       "X-Amz-Cf-Id": "smGLo2E7ScJmYyuGTDR5uCVZ5irOeRnud9QjrIICMlh-vXIGg44e-A==",
//       "X-Amzn-Trace-Id": "Root=1-5bb6430d-cf7ba2681fbef0d6352a0aea",
//       "X-Forwarded-For": "54.240.198.34, 54.239.134.9",
//       "X-Forwarded-Port": "443",
//       "X-Forwarded-Proto": "https"
//   },
//   "multiValueHeaders": {
//       "Accept": [
//           "application/vnd.aws-cdf-v1.0+json"
//       ],
//       "Accept-Encoding": [
//           "gzip, deflate"
//       ],
//       "CloudFront-Forwarded-Proto": [
//           "https"
//       ],
//       "CloudFront-Is-Desktop-Viewer": [
//           "true"
//       ],
//       "CloudFront-Is-Mobile-Viewer": [
//           "false"
//       ],
//       "CloudFront-Is-SmartTV-Viewer": [
//           "false"
//       ],
//       "CloudFront-Is-Tablet-Viewer": [
//           "false"
//       ],
//       "CloudFront-Viewer-Country": [
//           "US"
//       ],
//       "Content-Type": [
//           "application/vnd.aws-cdf-v1.0+json"
//       ],
//       "Host": [
//           "573h9e2j81.execute-api.us-west-2.amazonaws.com"
//       ],
//       "User-Agent": [
//           "node-superagent/3.8.3"
//       ],
//       "Via": [
//           "1.1 76bce8bb4fbd102fc0b3aa2e41094b79.cloudfront.net (CloudFront)"
//       ],
//       "X-Amz-Cf-Id": [
//           "smGLo2E7ScJmYyuGTDR5uCVZ5irOeRnud9QjrIICMlh-vXIGg44e-A=="
//       ],
//       "X-Amzn-Trace-Id": [
//           "Root=1-5bb6430d-cf7ba2681fbef0d6352a0aea"
//       ],
//       "X-Forwarded-For": [
//           "54.240.198.34, 54.239.134.9"
//       ],
//       "X-Forwarded-Port": [
//           "443"
//       ],
//       "X-Forwarded-Proto": [
//           "https"
//       ]
//   },
//   "queryStringParameters": null,
//   "multiValueQueryStringParameters": null,
//   "pathParameters": {
//       "proxy": "things"
//   },
//   "stageVariables": null,
//   "requestContext": {
//       "resourceId": "5pqwdm",
//       "resourcePath": "/{proxy+}",
//       "httpMethod": "POST",
//       "extendedRequestId": "OP9qDGdevHcF0hw=",
//       "requestTime": "04/Oct/2018:16:42:53 +0000",
//       "path": "/Prod/things",
//       "accountId": "157731826412",
//       "protocol": "HTTP/1.1",
//       "stage": "Prod",
//       "requestTimeEpoch": 1538671373107,
//       "requestId": "89b4b844-c7f4-11e8-aad5-1be67f24133a",
//       "identity": {
//           "cognitoIdentityPoolId": null,
//           "accountId": null,
//           "cognitoIdentityId": null,
//           "caller": null,
//           "sourceIp": "54.240.198.34",
//           "accessKey": null,
//           "cognitoAuthenticationType": null,
//           "cognitoAuthenticationProvider": null,
//           "userArn": null,
//           "userAgent": "node-superagent/3.8.3",
//           "user": null
//       },
//       "apiId": "573h9e2j81"
//   },
//   "body": "eyJwcm92aXNpb25pbmdUZW1wbGF0ZUlkIjoiYm9zY2giLCJwYXJhbWV0ZXJzIjp7IlRoaW5nTmFtZSI6IkVEU04xMTA1IiwiQ2FDZXJ0aWZpY2F0ZVBlbSI6Ii0tLS0tQkVHSU4gQ0VSVElGSUNBVEUtLS0tLVxuTUlJRDVUQ0NBczJnQXdJQkFnSUpBS09UVXBycWVQOTBNQTBHQ1NxR1NJYjNEUUVCQ3dVQU1JR0lNUXN3Q1FZRFxuVlFRR0V3SlZVekVMTUFrR0ExVUVDQXdDUTA4eER6QU5CZ05WQkFjTUJrUmxiblpsY2pFUU1BNEdBMVVFQ2d3SFxuUTNWdGJXbHVjekVRTUE0R0ExVUVDd3dIUlc1bmFXNWxjekVXTUJRR0ExVUVBd3dOS2k1amRXMXRhVzV6TG1OdlxuYlRFZk1CMEdDU3FHU0liM0RRRUpBUllRYVc1bWIwQmpkVzF0YVc1ekxtTnZiVEFlRncweE9EQTJNVGt5TURFNVxuTWpOYUZ3MHlNVEEwTURneU1ERTVNak5hTUlHSU1Rc3dDUVlEVlFRR0V3SlZVekVMTUFrR0ExVUVDQXdDUTA4eFxuRHpBTkJnTlZCQWNNQmtSbGJuWmxjakVRTUE0R0ExVUVDZ3dIUTNWdGJXbHVjekVRTUE0R0ExVUVDd3dIUlc1blxuYVc1bGN6RVdNQlFHQTFVRUF3d05LaTVqZFcxdGFXNXpMbU52YlRFZk1CMEdDU3FHU0liM0RRRUpBUllRYVc1bVxuYjBCamRXMXRhVzV6TG1OdmJUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQUt2Z1xuTUR4a1dzdEIxYU5rUVM3UnhkbVZXUTIyeWRCQjVQWkRYRDduenBkRzk3cVlueHFqN3NsN2FsN2k3QXpQcFNrWVxuWFJOSlNUNzgxTm9kaXdpRXZzZmRSWEVCUXByUG5GZXdiY2YvYktuWkxtYVlLbWJtbkJYVEllN2NYMGlad1JXeFxuaWducTVNVERDNVNEVVd3eENOckJsTlhBU0RmT2lpUEpJOWwrZGNOSkpMQjlQZjRabHNPd2U0NWlhMHZETFB4WFxuak81ZXdyZ2tRcFdoM0lFR0hOSjExaHpUZnBpSTU0RCtrT1J1ODNzUDBMRVdiNTkvRm5KZzdVcW4rbU4zMU1FVVxucnpBV1JBRVRQRUhYZllPSXV0NC92N0xYc3lINGZyTWFDREZYVUsxdlJIYno2blNWeGpBaThaZG9valY4MG1FbVxubnNOSUNnODZMSVE2KzJ3U3hQOENBd0VBQWFOUU1FNHdIUVlEVlIwT0JCWUVGUFNVOFBjUFJQaVVmejBPM1VycVxuQ3crNFUyQWdNQjhHQTFVZEl3UVlNQmFBRlBTVThQY1BSUGlVZnowTzNVcnFDdys0VTJBZ01Bd0dBMVVkRXdRRlxuTUFNQkFmOHdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBRDRhWVdUMlBlR054ZHVMQ2pSdXlUY1hwYjJaSFI1bFxueEk2UjJqZ0dSNTg0UUZNazF2RXRLaS9UVnJjeXZzZlNINTZ4bVFDc2tJbXFrbVp0T2NENVhBYVdKN2ZBZldHQlxuUUNaaWxFNmdHVmtFYmZWRlFXb2FIQ05KbWZpYnF0QVhMcFFqK1lVTjFkcEFDbEJBMFdYc3lDRVRqUExuSkFEbVxuMDAweVhXeDM1Ump0dVVSeWNzeFZvWXZLdWtIMVFMcDY5WnFwYlRVa0FNQlpFMVB6a2tZbUorUEFZR1BDRW1IVFxuSXdpbFhFaHlVcmtabHFFbUNGL1pWemNvVEJrN1JHRjQ1dFdYV0VBOGlwK25NWlFOMktYeXNXQld2ZlZOY3lUU1xuZWNsV2M0MThDbDdZTlJHN0dVTFpDeFlwVFZld1RHYjZ3eWpMb3dsUDh5eXZ0eXltUzBXRy9PVT1cbi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS1cbiIsIkNlcnRpZmljYXRlUGVtIjoiLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tXHJcbk1JSURXakNDQWtJQ0NRQ0hCWndVQnVxV3JUQU5CZ2txaGtpRzl3MEJBUXNGQURDQmlERUxNQWtHQTFVRUJoTUNcclxuVlZNeEN6QUpCZ05WQkFnTUFrTlBNUTh3RFFZRFZRUUhEQVpFWlc1MlpYSXhFREFPQmdOVkJBb01CME4xYlcxcFxyXG5ibk14RURBT0JnTlZCQXNNQjBWdVoybHVaWE14RmpBVUJnTlZCQU1NRFNvdVkzVnRiV2x1Y3k1amIyMHhIekFkXHJcbkJna3Foa2lHOXcwQkNRRVdFR2x1Wm05QVkzVnRiV2x1Y3k1amIyMHdIaGNOTVRnd056RXlNVFUxTmpRd1doY05cclxuTVRrd056RXlNVFUxTmpRd1dqQlZNUXN3Q1FZRFZRUUdFd0pWVXpFTE1Ba0dBMVVFQ0F3Q1EwRXhEekFOQmdOVlxyXG5CQW9NQm0xaGNtbHVaVEVTTUJBR0ExVUVDd3dKWlhGMWFYQnRaVzUwTVJRd0VnWURWUVFEREF0amRXMXRhVzV6XHJcbkxtTnZiVENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFOVTVrTkFTbDdjRnE2dS9cclxuRkhBTFVsUjZVNzdGTGMybFF4NURaelhHaW1EUVpYelE2OG9CQzFrUlN2MW94Q0J6Szg4OXI3QXdqLzR4Y3ZWT1xyXG5VUHVkUzlldFA2Z3BNYjJhZjBVaW5MTjVlTTBBTWpVc2RpcHFCSkdia0RNUzJSQ0QrdFhzSkhLVVVWaGxwK3lPXHJcbmNkUXMrZGQ3czVzV0lnOElVTUh1TVBTSGw2aGtPWVN0bGt4NytXZFBUbGlTMi9PakNsSGpjV2kwRzBCdENndTZcclxud1YycDdPalZvNjg3NDFKbDhhUTBOOXlFVTRtSEppRVM3Smtic1ZaV2dmNDZGRFVIRENPVGVlWkhWNkVIb0o2UlxyXG4vOWZMVDJlR0Z0RmV6OEhqV0I2S0x3QTFtUmszRGRSSHg0aVJWNU52b1k0NEp4eFRKajFMYzcxdjRieWUwYXVsXHJcbmkwcmRRR2tDQXdFQUFUQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUFpT3BlaHFjT1U4RlZVMmRQTzhhNitSNnVcclxuNjJPMjdxN2RqUWd0blE0L0t1ZGlZejZKcllvbEVPOHdhQzVtKzR4anFaSitXY25GOFJVOWpTV3Nuc2ROTDNFNlxyXG5mVlE2NU44RngvOU5SbWJvcnJXdVZoQU9HSDBYSnphTkhVYmhITlRobFlhekFxdUY1UXBTNFRXcW5KeWwrdFR5XHJcbkI3RUgyNGhqN2ozZ2hqY2NucjNiTjQvTmZLWjlJQnRYYURqOUNWSWNYOTFLK1pnYmtoTG8vVG4vaVVIdmp2YkpcclxuVEN6KzVyYjBCVEx6VlY4a3lwMDVPdVZ5MjFhYlVyRVJHM2t6eDRzSFo0MTlFbTlBZVZabStQOEVpZklCdllyVlxyXG4vOXBZaGd5TjBrSlRwUHUxQmluNHkxVXFIbUR6aWRkRFFYYllCekxTNW92MG5YM0MvTWVSTzFJZHNBZG9ydz09XHJcbi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0ifX0=",
//   "isBase64Encoded": true
// }

// Example Context:

// {
//   "callbackWaitsForEmptyEventLoop": true,
//   "logGroupName": "/aws/lambda/cdf-request-queue-development-ProxyLambdaFunction-UW97ZH3ZQG61",
//   "logStreamName": "2018/10/19/[$LATEST]9244accc72764e8f8d6f56183d9f780e",
//   "functionName": "cdf-request-queue-development-ProxyLambdaFunction-UW97ZH3ZQG61",
//   "memoryLimitInMB": "512",
//   "functionVersion": "$LATEST",
//   "invokeid": "ea18cf46-d3f6-11e8-bd5c-d359eec29b37",
//   "awsRequestId": "ea18cf46-d3f6-11e8-bd5c-d359eec29b37",
//   "invokedFunctionArn": "arn:aws:lambda:us-west-2:157731826412:function:cdf-request-queue-development-ProxyLambdaFunction-UW97ZH3ZQG61"
// }
