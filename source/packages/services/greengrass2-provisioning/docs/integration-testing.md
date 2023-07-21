# GREENGRASS V2 PROVISIONING INTEGRATION TESTING

The integration testing of this module requires a Greengrass V2 core device. We deploy one as needed as an EC2 instance. To simplify this process, a custom AMI and launch template is used.

## Greengrass V2 Core Device AMI

An AMI is created using the following steps:

- Launch a Linux 2 EC2 instance
- Run the following on the instance:

```sh
# Download root certificate

# go to home if you're using SSM to login
cd ~/

mkdir ~/certs &&
 curl -o ~/certs/AmazonRootCA1.pem https://www.amazontrust.com/repository/AmazonRootCA1.pem  &&
 sudo mkdir -p /greengrass/v2 &&
 sudo chmod 755 /greengrass &&
 sudo cp -R ~/certs/* /greengrass/v2

# Install java8 runtime
sudo amazon-linux-extras enable corretto8 &&
 sudo yum install -y java-1.8.0-amazon-corretto-devel

# Install aws cli v2
sudo curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" &&
 unzip awscliv2.zip &&
 sudo ./aws/install

# Download the AWS IoT Greengrass Core software
sudo curl https://d2s8p88vqu9w66.cloudfront.net/releases/greengrass-nucleus-latest.zip -o greengrass-nucleus-latest.zip &&
 sudo unzip greengrass-nucleus-latest.zip -d GreengrassCore && sudo rm greengrass-nucleus-latest.zip

# change `root    ALL=(ALL)   ALL` to `root    ALL=(ALL:ALL)   ALL`
sudo nano /etc/sudoers
```

- Create an AMI from the instance
- Terminate the instance

## Launching an EC2 Based Greengrass V2 Core Device

Once the AMI is created, run the following command to launch and configure a Greengrass V2 core device on EC2:

```sh
export THING_NAME=<thing-name>
export ARTIFACTS_S3_BUCKET=<s3-bucket>
export ARTIFACTS_S3_PREFIX=<s3-prefix>
export AMI_ID=<ami-id>
export IAM_INSTANCE_PROFILE=<iam-instance-profile>

export certs_presigned_url=$(aws s3 presign s3://${ARTIFACTS_S3_BUCKET}/${ARTIFACTS_S3_PREFIX}${THING_NAME}/${THING_NAME}/certs.zip)
export config_presigned_url=$(aws s3 presign s3://${ARTIFACTS_S3_BUCKET}/${ARTIFACTS_S3_PREFIX}${THING_NAME}/${THING_NAME}/installerConfig.yml)

cat << EOF > ggv2_core_device_install_script.txt
#!/bin/bash

cd /home/ec2-user

curl '''${certs_presigned_url}''' > certs.zip
unzip certs.zip
sudo cp -R certs/* /greengrass/v2

curl '''${config_presigned_url}''' > GreengrassCore/config.yaml

sudo -E java -Droot="/greengrass/v2" -Dlog.store=FILE \
  -jar GreengrassCore/lib/Greengrass.jar \
  --init-config GreengrassCore/config.yaml \
  --component-default-user ggc_user:ggc_group \
  --setup-system-service true

EOF

instance_metadata=$(aws ec2 run-instances \
 --image-id ${AMI_ID} \
 --instance-type t3.medium \
 --iam-instance-profile  Name=${IAM_INSTANCE_PROFILE} \
 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cdf-ggv2-'$THING_NAME'}]' \
 --user-data file://ggv2_core_device_install_script.txt)
```

After a couple of minutes a new EC2 instance should be up and running representing the Greengrass V2 core device. Shortly after you should see the device registed as a Greengrass V2 core device within the AWS IoT console.
