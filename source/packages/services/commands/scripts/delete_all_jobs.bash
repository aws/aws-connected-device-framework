#!/bin/bash

jobs=$(aws iot list-jobs --region us-west-2 --profile deanhart-1577 --status IN_PROGRESS | jq -r '.jobs[] | .jobId')

for job in $jobs; do
    echo Deleting job $job
    aws iot delete-job --region us-west-2 --profile deanhart-1577 --job-id $job --force
done
