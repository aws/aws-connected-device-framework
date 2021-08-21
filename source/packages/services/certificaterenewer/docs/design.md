# Certificate Renewer: Design

The CDF Certificate Renewer service has two lambdas, that are responsible for processing certificate expiring alert received from device defender.
- CDF Certificate Renewer
- CDF Certificate Processor 

## High Level Architecture
 ![](images/architecture.jpg)

## AWS IoT Certificate Renewer Flow - Sequence diagram
 ![](images/renewer-sequence.png)

## AWS IoT Certificate Processor Flow - Sequence diagram
 ![](images/processor-sequence.png)