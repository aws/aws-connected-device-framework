# Deployment Guide

## On Local Computer:

1. Ensure  you have a Docker installed and running. Follow the process here to install Docker:
    1. Docker Installation: * Install Docker Desktop on Mac (https://docs.docker.com/desktop/mac/install/)
    2. Install Docker Desktop on Windows (https://docs.docker.com/desktop/windows/install/)
2. Ensure  you have a git client (https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed : 

        sudo apt install git-all
    
5. Clone  the project:            
    1. Create directory for CDF project and navigate terminal to that location before executing below command
    2. git clone https://github.com/aws/aws-connected-device-framework.git
6. Using  nvm installed from the previous step, install Node.js v14:
        
        nvm install v14.18.1 
        
        nvm use v14 
7. Initialize  the project dependencies:
        
        cd aws-connected-device-framework/source
        
        export env_name=ENV_NAME
        
        export aws_profile=PROFILE_NAME
        
        export region='REGION'
        
        export kms_key_owner=$(aws iam get-user --query 'User.UserName' --output text)
        
        export cdf_admin_email=PASTE YOUR EMAIL HERE
        
6. In console Create S3 bucket: i.e. cdf-deployment-assetlibrary 

8. export s3_bucket_name= BUCKET-NAME

10. EC2 Keypair:
        
        export keypair_name=${kms_key_owner}_${env_name}_cdf
        
        rm -f ~/.ssh/$keypair_name.pem
        
        aws ec2 create-key-pair \
        --key-name ${keypair_name} \
        --query 'KeyMaterial' \
        --output text >~/.ssh/${keypair_name}.pem
        
        chmod 400 ~/.ssh/${keypair_name}.pem
        
9. Create Configurations:
    1. Create folder “cdf-configurations” file under “source” directory 
    2. Create folder for each required service  under directory “cdf-configurations” i.e. “assetlibrary”.  Note: Make sure name matches service names as show below. Only create folder for services those need to be deployed.
        1. [Image: Screen Shot 2021-11-17 at 3.27.04 PM.png]
    3. Create configuration file under each service folder with name: ENV_NAME-config.json.  (Note: replace ENV_NAME with your environment name) 
    4. Follow configuration.md inside each service for direction on configuration file. (Location: source>packages>services>SERVICE_NAME)
10. Install and Bundle project using rush:
        
        npm install -g @microsoft/rush
        
        rush install
        
        rush bundle
        
11. Deployment command:
    1. Following command deploys asset library lite version + services that has configuration defined:
        
            ./infrastructure/deploy-core.bash -e ENV_NAME \
            -b BUCKET-NAME \
            -p EC2_KEYPAIR_NAME \
            -R REGION \
            -P PROFILE_NAME \
            -y s3://BUCKET-NAME/snippets/ \
            -z cfn-apiGateway-noAuth.yaml \
            -i 0.0.0.0/0 \
            -c /aws-connected-device-framework/source/cdf-configurations \
            -m lite \
            -B
    2. Following command deploys asset library full ** version + services that has configuration defined:
        
            ./infrastructure/deploy-core.bash -e ENV_NAME \
            -b BUCKET-NAME \
            -p EC2_KEYPAIR_NAME \
            -R REGION \
            -P PROFILE_NAME \
            -y s3://BUCKET-NAME/snippets/ \
            -z cfn-apiGateway-noAuth.yaml \
            -i 0.0.0.0/0 \
            -c /aws-connected-device-framework/source/cdf-configurations \
            -m full \
            -B
        
12. Deploying with changes to code:
    1. rush bundle
    2. Run deployment command



## On Cloud-9:

1. Launch a Cloud9 instance in  your account with a minimum t3.xlarge instance type and Ubuntu 18.04.
2. Open the launched Cloud9 IDE.
3. Using the bash terminal in  the Cloud9 IDE, invoke the following commands.
4. AWS CLI v2 installation: 
      
        sudo pip3 uninstall awscli
        
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"  -o "awscliv2.zip"
        
        unzip awscliv2.zip
        
        sudo ./aws/install
        
        rm -rf aws/ awscliv2.zip
        
5. Basic package dependencies
      
        sudo apt-get install jq
        
6. Follow the instructions for Moving an environment and resizing or encrypting Amazon  EBS volumes (https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html) to increase the root file system volume size to 25  (25GB). If you are using an NVM volume, the script doesn’t look to be  working totally correct so you can use the following:
    
    a. Get Instance ID: 
    
        INSTANCEID=$(curl http://169.254.169.254/latest/meta-data/instance-id)
    
    b. Get the ID of the Amazon EBS volume associated with the instance.
         
         VOLUMEID=$(aws ec2 describe-instances \
          --instance-id $INSTANCEID \
          --query "Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId" \
          --output text)
    
    c. Resize the EBS volume.
         
         aws ec2 modify-volume --volume-id $VOLUMEID --size 25
    
    d. Wait for the resize to finish.
         
         while [ \
          "$(aws ec2 describe-volumes-modifications \
            --volume-id $VOLUMEID \
            --filters Name=modification-state,Values="optimizing","completed" \
            --query "length(VolumesModifications)"\
            --output text)" != "1" ]; do
         
         sleep 1
         
         done
    
    e. Verify Changes
    
        sudo growpart /dev/nvme0n1 1
        
        sudo resize2fs /dev/nvme0n1p1

7. Ensure  you have a git client (https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed : 

        sudo apt install git-all

8. Clone  the project:
    1. Create directory for CDF project and navigate terminal to that location before executing below command
    2. git clone https://github.com/aws/aws-connected-device-framework.git

9. Using  nvm installed from the previous step, install Node.js v14:
        
        nvm install v14.18.1 
        
        nvm use v14 
        
10. Initialize  the project dependencies:
        
        cd aws-connected-device-framework/source
        
        export env_name=ENV_NAME
        
        export aws_profile=PROFILE_NAME
        
        export region='REGION'
        
        export kms_key_owner=$(aws iam get-user --query 'User.UserName' --output text)
        
        export cdf_admin_email=PASTE YOUR EMAIL HERE
        
11. In console Create S3 bucket: i.e. cdf-deployment-assetlibrary 
        
        export s3_bucket_name= BUCKET-NAME
        
12. EC2 Keypair:
        
        export keypair_name=${kms_key_owner}_${env_name}_cdf
        
        rm -f ~/.ssh/$keypair_name.pem
        
        aws ec2 create-key-pair \
        --key-name ${keypair_name} \
        --query 'KeyMaterial' \
        --output text >~/.ssh/${keypair_name}.pem
        
        chmod 400 ~/.ssh/${keypair_name}.pem
        
13. Create Configurations:
    1. Create folder “cdf-configurations” file under “source” directory 
    2. Create folder for each required service  under directory “cdf-configurations” i.e. “assetlibrary”.  Note: Make sure name matches service names as show below. Only create folder for services those need to be deployed.
        1. [Image: Screen Shot 2021-11-17 at 3.27.04 PM.png]
    3. Create configuration file under each service folder with name: ENV_NAME-config.json (Note: replace ENV_NAME with environment name) 
    4. Follow configuration.md  inside each service for direction on configuration file. (Location: source>packages>services>SERVICE_NAME) 
14. Bundle project using rush:
        
        npm install -g @microsoft/rush
        
        rush install
        
        rush bundle
        
15. Deployment command:
    1. Following command deploys *asset library lite* version:
            
            ./infrastructure/deploy-core.bash -e ENV_NAME \
            -b BUCKET-NAME \
            -p EC2_KEYPAIR_NAME \
            -R REGION \
            -P PROFILE_NAME \
            -y s3://BUCKET-NAME/snippets/ \
            -z cfn-apiGateway-noAuth.yaml \
            -i 0.0.0.0/0 \
            -c /aws-connected-device-framework/source/cdf-configurations \
            -m lite \
            -B
            
    2. Following command deploys *asset library full* version:
            
            ./infrastructure/deploy-core.bash -e ENV_NAME \
            -b BUCKET-NAME \
            -p EC2_KEYPAIR_NAME \
            -R REGION \
            -P PROFILE_NAME \
            -y s3://BUCKET-NAME/snippets/ \
            -z cfn-apiGateway-noAuth.yaml \
            -i 0.0.0.0/0 \
            -c /aws-connected-device-framework/source/cdf-configurations \
            -m full \
            -B

16. Deploying with changes to code:
    1. rush bundle
    2. Run deployment command

 
