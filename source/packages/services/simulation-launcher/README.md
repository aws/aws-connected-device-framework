# CDF SIMULATION LAUNCHER OVERVIEW

# Introduction

The _Simulation Launcher_ module, along with the [_Simulation Manager_](../simulation-manager/README.md) module, together form the _CDF Fleet Simulator_ module.

It is responsible for launching and managing Fargate instances that run multiple instances of a device simulator.

## Architecture

The following represents the architecture of the Simulation Launcher module along with its mandatory sibling [Simulation Manager](../simulation-manager/README.md) module.

![Architecture](<docs/images/cdf-core-hla-simulator.png>)

[Simulation Manager](../simulation-manager/README.md) provides a set of API's that can be used to create and manage Fleet simulations.

The incoming simulation events are routed to the simulation launcher that provisions and manages the ECS Fargate Cluster that runs the test plans which may include device simulations.

Each ECS Fargate task uses its configuration to pull the relevant test plan and artifacts from the configured S3 bucket. Jmeter is used to execute the test plans on each Fargate instance,  and uploads the simulation results once complete.

## Useful Links

- [Application configuration](docs/configuration.md)
