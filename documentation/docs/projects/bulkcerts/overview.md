# BULK CERTS REST API

## Introduction

The bulk certs service allows for the creation of large batches of X.509 certificates, and optionally register them with AWS IoT.

When a batch is requested, a task is created to track the creation of certificates.  Upon task creation, the creation call is returned immediately to the caller.  The task itself is then split in smaller chunks to allow for quick processing.  Once all chunks are complete, the overall task is complete, and the certificates can be downloaded as a single zip file.