
# NPM Private Repository

CDF utilizes (verdaccio)[https://www.verdaccio.org] as a private npm repository for sharing common private modules between the CDF services.

## Installation

- Launch an EC2 instance, with an additional EBS volume mounted

- Format and mount the partition

```sh
# obtain the volume name
lsblk
# check to see if it has already been formatted or not
sudo file -s /dev/xvdb

# if above returned `data` then need to format:
sudo mkfs -t ext4 /dev/xvdb 

# mount:
sudo mkdir /verdaccio_data
sudo mount /dev/xvdb /verdaccio_data

# chown data directory so verdaccio (not run as root) can read/write
sudo chown ec2-user:ec2-user /verdaccio_data

# configure mount to survive reboots by adding the following to /etc/fstab:
/dev/xvdb   /verdaccio_data ext4 defaults,nofail
```

- Install node.js

```sh
sudo yum update -y
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 8.11.2
```

- Install verdaccio

```sh
npm install -g verdaccio
```

- Configure verdaccio (~/.config/verdaccio/config.yaml)

```sh
storage: /verdaccio_data
auth:
  htpasswd:
    file: ./htpasswd
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
  '@*/*':
    access: $all
    publish: $authenticated
    proxy: npmjs
  '**':
    proxy: npmjs
web:
  enable: true
  title: CDF Verdaccio
listen:
  - 0.0.0.0:4873
logs:
  - {type: stdout, format: pretty, level: http}
```

- Add iptable rule to route port 80 to 4873 to get around restrictions with VPN allowed port usage

```sh
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 4873
```

- Configure Verdaccio to start on reboot

```sh
npm install pm2@latest -g
pm2 start verdaccio
```