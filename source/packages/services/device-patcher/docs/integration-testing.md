# DEVICE PATCHER INTEGRATION TESTING

The integration testing of this module requires an EC2 instance. To simplify this process, a custom AMI and launch template is used.

## Device Patcher EC2 Instance (Ready For SSM (Ansible) Patch Deployments)

An AMI is created using the following steps:

- Launch a Linux 2 EC2 instance
- Run the following on the instance:

```sh
sudo yum -y update
sudo amazon-linux-extras install epel
sudo yum -y install ansible
```

- Create an AMI from the instance
- Terminate the instance

**NOTE:** The instance still needs to be ssm agent activated as hybrid instance before a patch can be deployed. This step is performed automatically as part of integration tests but is your responsibility when using this AMI elsewhere.

