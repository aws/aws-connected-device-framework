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
set -x

freeMem=`awk '/MemFree/ { print int($2/1024) }' /proc/meminfo`
s=$(($freeMem/10*8))
x=$(($freeMem/10*8))
n=$(($freeMem/10*2))
export JVM_ARGS="-Xmn${n}m -Xms${s}m -Xmx${x}m"

echo "START Running Jmeter on `date`"
echo "JVM_ARGS=${JVM_ARGS}"
echo "jmeter args=$@"

# empty the logs directory, or jmeter may fail
rm -rf /opt/jmeter/*.log /opt/jmeter/*.jtl

rm -rf "$JMETER_BIN/cdf"
mkdir -p "$JMETER_BIN/cdf"

# download the test plan and properties from S3
aws s3 cp "s3://$BUCKET/$TEST_PLAN" "$JMETER_BIN/cdf/plan.jmx"
aws s3 cp "s3://$BUCKET/$EXTERNAL_PROPERTIES" "$JMETER_BIN/cdf/config.properties"

# launch jmeter
set +e
cd /opt/jmeter
jmeter -n $JMETER_FLAGS \
  -p "$JMETER_BIN/cdf/config.properties" \
  -l results.jtl \
  -j logfile.txt \
  -t "$JMETER_BIN/cdf/plan.jmx" \
  || true

# need to waut for jmeter to finish writing to the logs once it shuts down
sleep 5

# upload logs and results to s3
aws s3 cp logfile.txt "s3://$BUCKET/$UPLOAD_DIR"logfile.txt
aws s3 cp results.jtl "s3://$BUCKET/$UPLOAD_DIR"results.jtl

echo "Logs...."
cat logfile.txt

echo "Results..."
cat results.jtl
