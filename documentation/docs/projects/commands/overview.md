# COMMANDS REST API

## Introduction

The commands service utilizes [AWS IoT Jobs](https://docs.aws.amazon.com/iot/latest/developerguide/iot-jobs.html) to issue commands to a device or set of devices, and optionally inspect their execution status.  It augments AWS IoT jobs by providing the ability to create Job templates, and enforcing that each requested command adheres to a template before executing.
