#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

FROM public.ecr.aws/amazonlinux/amazonlinux:2

LABEL maintainer="deanhart@amazon.com"

ENV TEMP_WORK_DIR /tmp/build

RUN yum update -y && \
  yum install -y openssl zip

RUN mkdir -p $TEMP_WORK_DIR
WORKDIR $TEMP_WORK_DIR

CMD mkdir -p bin lib && \
    cp /bin/openssl bin/ && \
    cp /usr/lib64/libbz2.so.1 lib/ && \
    find . -exec touch -d @0 {} \; && \
    zip -roX build.zip * && \
    rm -rf bin lib
