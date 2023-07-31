## Prerequisites for Development

Tool / Technology | Reason
---|---
[nvm](https://github.com/nvm-sh/nvm#installing-and-updating) | Simple way to manage multiple versions of Node.js
[rush](https://rushjs.io/pages/developer/new_developer/) | Build/Bundle tool
Node.js v18.x | Install using `nvm install 18`, and/or switch to it using `nvm use 18`
[Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) | Version control

Please reference each tool's documentation for full installation instructions, linked above.

## Prerequisites for Deployment
Tool / Technology | Reason
---|---
[aws cli (v2)](http://docs.aws.amazon.com/cli/latest/userguide/installing.html) | Used as part of some deployment scripts
[jq](https://stedolan.github.io/jq/download/) | Used as part of some deployment scripts
[docker](https://docs.docker.com/get-docker/) | Used for building the OpenSSL Lambda layer
