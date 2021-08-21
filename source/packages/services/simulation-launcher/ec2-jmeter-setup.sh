#!/bin/sh
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

export JMETER_VERSION="5.1.1"
export AWSCLI_VERSION="1.16.278"
export JMETER_PLUGINS_MANAGER_VERSION="1.3"
export CMDRUNNER_VERSION="2.2"
export JSON_LIB_VERSION="2.4"
export JSON_LIB_FULL_VERSION="${JSON_LIB_VERSION}-jdk15"

export JMETER_HOME=/opt/apache-jmeter-${JMETER_VERSION}
export JMETER_BIN=${JMETER_HOME}/bin
export PATH=$PATH:$JMETER_BIN
export JMETER_DOWNLOAD_URL=https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz
export RESULTS_LOG=results.jtl
export PATH=/root/.local/bin:$PATH

# install aws cli
apk add --update \
    python \
    python-dev \
    py-pip \
    build-base \
    && pip install awscli==$AWSCLI_VERSION --upgrade --user \
    && apk --purge -v del py-pip \
    && rm -rf /var/cache/apk/*

# Install jmeter
apk update \
	&& apk upgrade \
	&& apk add ca-certificates \
	&& update-ca-certificates \
	&& apk add --update openjdk8-jre tzdata curl unzip bash \
	&& apk add --no-cache nss \
	&& rm -rf /var/cache/apk/* \
	&& mkdir -p /tmp/dependencies  \
	&& curl -L --silent ${JMETER_DOWNLOAD_URL} >  /tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz  \
	&& mkdir -p /opt  \
	&& tar -xzf /tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz -C /opt  \
	&& rm -rf /tmp/dependencies

# Install jmeter plugins
cd /tmp/ \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/ext/jmeter-plugins-manager-${JMETER_PLUGINS_MANAGER_VERSION}.jar http://search.maven.org/remotecontent?filepath=kg/apc/jmeter-plugins-manager/${JMETER_PLUGINS_MANAGER_VERSION}/jmeter-plugins-manager-${JMETER_PLUGINS_MANAGER_VERSION}.jar \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/cmdrunner-${CMDRUNNER_VERSION}.jar http://search.maven.org/remotecontent?filepath=kg/apc/cmdrunner/${CMDRUNNER_VERSION}/cmdrunner-${CMDRUNNER_VERSION}.jar \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/json-lib-${JSON_LIB_FULL_VERSION}.jar https://search.maven.org/remotecontent?filepath=net/sf/json-lib/json-lib/${JSON_LIB_VERSION}/json-lib-${JSON_LIB_FULL_VERSION}.jar \
 && curl --location --silent --show-error --output ${JMETER_HOME}/lib/ext/mqtt-xmeter-1.0.1-jar-with-dependencies.jar https://github.com/emqx/mqtt-jmeter/releases/download/1.0.1/mqtt-xmeter-1.0.1-jar-with-dependencies.jar \
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
jpgc-pde=0.1,\
jpgc-perfmon=2.1,\
jpgc-plancheck=2.4,\
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

##### # node setup

export VERSION=v8.16.2 
export NPM_VERSION=6 

apk add --no-cache curl make gcc g++ python linux-headers binutils-gold gnupg libstdc++ && \
  for server in ipv4.pool.sks-keyservers.net keyserver.pgp.com ha.pool.sks-keyservers.net; do \
    gpg --keyserver $server --recv-keys \
      4ED778F539E3634C779C87C6D7062848A1AB005C \
      B9E2F5981AA6E0CD28160D9FF13993A75599653C \
      94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
      B9AE9905FFD7803F25714661B63B535A4C206CA9 \
      77984A986EBC2AA786BC0F66B01FBB92821C587A \
      71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
      FD3A5288F042B6850C66B31F09FE44734EB7990E \
      8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
      C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
      DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
      A48C2BEE680E841632CD4E44F07496B3EB3C1762 && break; \
  done && \
  curl -sfSLO https://nodejs.org/dist/${VERSION}/node-${VERSION}.tar.xz && \
  curl -sfSL https://nodejs.org/dist/${VERSION}/SHASUMS256.txt.asc | gpg -d -o SHASUMS256.txt && \
  grep " node-${VERSION}.tar.xz\$" SHASUMS256.txt | sha256sum -c | grep ': OK$' && \
  tar -xf node-${VERSION}.tar.xz && \
  cd node-${VERSION} && \
  ./configure --prefix=/usr ${CONFIG_FLAGS} && \
  make -j$(getconf _NPROCESSORS_ONLN) && \
  make install && \
  cd / && \
  if [ -z "$CONFIG_FLAGS" ]; then \
    if [ -n "$NPM_VERSION" ]; then \
      npm install -g npm@${NPM_VERSION}; \
    fi; \
    find /usr/lib/node_modules/npm -name test -o -name .bin -type d | xargs rm -rf; \
    if [ -n "$YARN_VERSION" ]; then \
      for server in ipv4.pool.sks-keyservers.net keyserver.pgp.com ha.pool.sks-keyservers.net; do \
        gpg --keyserver $server --recv-keys \
          6A010C5166006599AA17F08146C2130DFD2497F5 && break; \
      done && \
      curl -sfSL -O https://yarnpkg.com/${YARN_VERSION}.tar.gz -O https://yarnpkg.com/${YARN_VERSION}.tar.gz.asc && \
      gpg --batch --verify ${YARN_VERSION}.tar.gz.asc ${YARN_VERSION}.tar.gz && \
      mkdir /usr/local/share/yarn && \
      tar -xf ${YARN_VERSION}.tar.gz -C /usr/local/share/yarn --strip 1 && \
      ln -s /usr/local/share/yarn/bin/yarn /usr/local/bin/ && \
      ln -s /usr/local/share/yarn/bin/yarnpkg /usr/local/bin/ && \
      rm ${YARN_VERSION}.tar.gz*; \
    fi; \
  fi && \
  apk del curl make gcc g++ python linux-headers binutils-gold gnupg ${DEL_PKGS} && \
  rm -rf ${RM_DIRS} /node-${VERSION}* /SHASUMS256.txt /tmp/* /var/cache/apk/* \
    /usr/share/man/* /usr/share/doc /root/.npm /root/.node-gyp /root/.config \
    /usr/lib/node_modules/npm/man /usr/lib/node_modules/npm/doc /usr/lib/node_modules/npm/html /usr/lib/node_modules/npm/scripts && \
  { rm -rf /root/.gnupg || true; }


