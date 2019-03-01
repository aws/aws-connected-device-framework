# Examples deploying a new cicd pipeline:

## 'full' mode into an existing VPC
```sh
./deploy-cicd-pipeline.bash \
  -b cdf-157731826412-us-west-2 \
  -e development \
  -g cicd \
  -l cicd \
  -i cdf-infrastructure-cummins \
  -v vpc-034b3ce7ffacce9d0 \
  -s sg-031fcef7b2821037e \
  -n subnet-0df8ef64dfa6dc825,subnet-0be681a72c7db1c2d \
  -t rtb-0fc5765aa27fc5fda,rtb-047e1214af8916769 \
  -P deanhart-1577 \
  -R us-west-2 
```
