## Create an ECR repo

This is a one-time setup:

```sh
aws ecr create-repository --repository-name cdf-jmeter
```

Returns: 

```json
{
    "repository": {
        "repositoryArn": "arn:aws:ecr:us-west-2:xxxxxxxxxxxx:repository/jmeter",
        "registryId": "xxxxxxxxxxxx",
        "repositoryName": "jmeter",
        "repositoryUri": "xxxxxxxxxxxx.dkr.ecr.us-west-2.amazonaws.com/jmeter",
        "createdAt": 1573497220.0,
        "imageTagMutability": "MUTABLE"
    }
}
```

The `repositoryUri` from the above response is required when tagging and pushing docker images to ECR.

## Building

```sh
docker build -t jmeter jmeter/.
```

## Uploading the image

Retrieve the `docker login` command:

```sh
aws ecr get-login --no-include-email 
```

Copy, paste and run the response from the previous step to log into the docker repo.

Tag the docker image using the `repositoryUri`:

```sh
docker tag jmeter "xxxxxxxxxxxx.dkr.ecr.us-west-2.amazonaws.com/jmeter"
```

Finally, upload to ECR:

```sh
docker push "xxxxxxxxxxxx.dkr.ecr.us-west-2.amazonaws.com/jmeter"
```

## Local debugging
In order to run the container locally, you need to change the settings in `./docker-compose.yaml`. Once you supplied all necessary information, you can run the container locally but executing

```sh
$ docker-compose up
```

you should see something like on stdout:

```sh
Recreating jmeter ... done
Attaching to jmeter
jmeter    | + awk '/MemFree/ { print int($2/1024) }' /proc/meminfo
jmeter    | + freeMem=468
jmeter    | + s=368
jmeter    | + x=368
jmeter    | + n=92
...
```