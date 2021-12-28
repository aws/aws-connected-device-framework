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

FROM public.ecr.aws/amazonlinux/amazonlinux:latest

LABEL maintainer="Dean Hart"

ARG JMETER_VERSION="5.4.3"
ARG AWSCLI_VERSION="1.16.278"
ARG JMETER_PLUGINS_MANAGER_VERSION="1.3"
ARG CMDRUNNER_VERSION="2.2"
ARG JSON_LIB_VERSION="2.4"
ARG JSON_LIB_FULL_VERSION="${JSON_LIB_VERSION}-jdk15"

ENV JMETER_HOME /opt/apache-jmeter-${JMETER_VERSION}
ENV	JMETER_BIN	${JMETER_HOME}/bin
ENV PATH $PATH:$JMETER_BIN
ENV	JMETER_DOWNLOAD_URL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz
ENV RESULTS_LOG results.jtl
ENV PATH=/root/.local/bin:$PATH

# install aws cli
RUN yum install -y \
    python \
    python-devel \
    python-pip \
    java-1.8.0-openjdk \
    && pip install awscli==$AWSCLI_VERSION --upgrade --user \
    && yum remove -y python-pip \
    && yum clean all

# Install jmeter
RUN    yum update -y \
	&& yum upgrade -y \
	&& yum install -y ca-certificates \
	&& update-ca-trust \
	&& yum install -y openjdk8-jre tzdata curl unzip bash nss gzip tar\
	&& mkdir -p /tmp/dependencies  \
	&& curl -L --silent ${JMETER_DOWNLOAD_URL} >  /tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz  \
	&& mkdir -p /opt  \
	&& tar -xzvf "/tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz" -C /opt  \
	&& rm -rf /tmp/dependencies

# Install jmeter plugins
RUN cd /tmp/ \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/ext/jmeter-plugins-manager-${JMETER_PLUGINS_MANAGER_VERSION}.jar http://search.maven.org/remotecontent?filepath=kg/apc/jmeter-plugins-manager/${JMETER_PLUGINS_MANAGER_VERSION}/jmeter-plugins-manager-${JMETER_PLUGINS_MANAGER_VERSION}.jar \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/cmdrunner-${CMDRUNNER_VERSION}.jar http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/${CMDRUNNER_VERSION}/cmdrunner-${CMDRUNNER_VERSION}.jar \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/json-lib-${JSON_LIB_FULL_VERSION}.jar https://search.maven.org/remotecontent?filepath=net/sf/json-lib/json-lib/${JSON_LIB_VERSION}/json-lib-${JSON_LIB_FULL_VERSION}.jar \
 && java -cp ${JMETER_HOME}/lib/ext/jmeter-plugins-manager-${JMETER_PLUGINS_MANAGER_VERSION}.jar org.jmeterplugins.repository.PluginManagerCMDInstaller \
 && PluginsManagerCMD.sh install \
blazemeter-debugger=0.6,\
bzm-hls=2.0,\
bzm-http2=1.4.1,\
bzm-parallel=0.9,\
bzm-random-csv=0.6,\
bzm-rte=2.2,\
bzm-siebel=0.1.0-beta,\
custom-soap=1.3.3,\
jmeter.backendlistener.elasticsearch=2.6.9,\
jmeter.backendlistener.kafka=1.0.0,\
jmeter.pack-listener=1.7,\
jpgc-autostop=0.1,\
jpgc-casutg=2.9,\
jpgc-cmd=2.2,\
jpgc-csl=0.1,\
jpgc-csvars=0.1,\
jpgc-dbmon=0.1,\
jpgc-directory-listing=0.3,\
jpgc-dummy=0.4,\
jpgc-ffw=2.0,\
jpgc-fifo=0.2,\
jpgc-filterresults=2.2,\
jpgc-functions=2.1,\
jpgc-ggl=2.0,\
jpgc-graphs-additional=2.0,\
jpgc-graphs-basic=2.0,\
jpgc-graphs-composite=2.0,\
jpgc-graphs-dist=2.0,\
jpgc-graphs-vs=2.0,\
jpgc-hadoop=2.0,\
jpgc-httpraw=0.1,\
jpgc-jms=0.2,\
jpgc-jmxmon=0.2,\
jpgc-json=2.7,\
jpgc-lockfile=0.1,\
jpgc-mergeresults=2.1,\
# jpgc-oauth=0.1,\
jpgc-pde=0.1,\
jpgc-perfmon=2.1,\
jpgc-plancheck=2.4,\
# jpgc-plugins-manager=${JMETER_PLUGINS_MANAGER_VERSION},\
jpgc-prmctl=0.4,\
jpgc-redis=0.3,\
jpgc-rotating-listener=0.2,\
jpgc-sense=3.5,\
jpgc-standard=2.0,\
jpgc-sts=2.4,\
jpgc-synthesis=2.2,\
jpgc-tst=2.5,\
jpgc-udp=0.4,\
jpgc-webdriver=3.1,\
jpgc-wsc=0.7,\
jpgc-xml=0.1,\
jpgc-xmpp=1.5.1,\
kafkameter=0.2.0,\
# mqtt-sampler=0.0.1-SNAPSHOT,\
netflix-cassandra=0.2-SNAPSHOT,\
ssh-sampler=1.1.1-SNAPSHOT,\
tilln-iso8583=1.0,\
tilln-sshmon=1.2,\
tilln-wssecurity=1.7,\
websocket-sampler=1.0.2-SNAPSHOT,\
websocket-samplers=1.2.2 \
 && jmeter --version \
 && PluginsManagerCMD.sh status \
 && chmod +x ${JMETER_HOME}/bin/*.sh \
 && rm -fr /tmp/*

RUN  curl --location --silent --show-error --output ${JMETER_HOME}/lib/ext/mqtt-xmeter-1.0.1-jar-with-dependencies.jar https://github.com/emqx/mqtt-jmeter/releases/download/1.0.1/mqtt-xmeter-1.0.1-jar-with-dependencies.jar

# install nodejs 16, commonly used by test plans
RUN curl -fsSL https://rpm.nodesource.com/setup_16.x | bash - \
    && yum install -y nodejs

 # add additional dependencies
ADD lib/* ${JMETER_HOME}/lib/ext/
RUN rm -f /opt/apache-jmeter-5.4.3/lib/httpclient-4.5.12.jar

WORKDIR /opt/jmeter

COPY entrypoint.sh /opt/jmeter/
RUN chmod +x /opt/jmeter/entrypoint.sh

EXPOSE 1099 50000 51000 4445/udp

ENTRYPOINT ["/opt/jmeter/entrypoint.sh"]
