FROM amazonlinux:2

LABEL maintainer="deanhart@amazon.com"

ENV TEMP_WORK_DIR /tmp/build

RUN yum update -y && \
  yum install -y openssl zip

RUN mkdir -p $TEMP_WORK_DIR
WORKDIR $TEMP_WORK_DIR

CMD mkdir -p bin lib && \
    cp /bin/openssl bin/ && \
    cp /usr/lib64/libbz2.so.1 lib/ && \
    zip -r build.zip * && \
    rm -rf bin lib
