# Day 1 backend bootstrap

Java **JDK21**, Spring Boot3.5.16, Maven3.9.11 wrapper and AWS IoT Device SDK Java v2 1.34.0. No REST/database/control endpoints yet. Use `JAVA_HOME` pointing to a full JDK, not a JRE; cloud audit machine initially had only a Java runtime.

```bash
cd backend
./mvnw -B verify
./mvnw -B exec:java \
  -Dexec.mainClass=vn.smartfarm.iot.mqtt.MqttConnectivityProbe \
  -Dexec.args=--self-test
```

Self-test loads AWS CRT native libraries and builds WSS settings without connecting to AWS. It does not validate credentials, network or device telemetry.

Live gate, with an existing authenticated AWS profile/role and attached backend IAM policy rendered by `tools/aws/provision_day1.py`:

```bash
export AWS_REGION=ap-southeast-1
export AWS_IOT_ENDPOINT=YOUR_DATA_ATS_HOSTNAME
export PROBE_SECONDS=300
./mvnw -B exec:java -Dexec.mainClass=vn.smartfarm.iot.mqtt.MqttConnectivityProbe
```

Probe subscribes ENV01 telemetry and its own backend echo, publishes only an echo, waits for broker PUBACK/echo and counts telemetry over5 minutes. At least58 packets expected; packet count alone is not full schema validation or proof of sensor values. AWS Test Client + firmware serial/actual input changes are additional evidence. Do not run two backend probes with the same client ID. AWS default provider chain uses existing local credentials; never paste keys into source or terminal logs.

Behind a cloud egress proxy, Java/Maven do not automatically consume HTTPS_PROXY. Use a private Maven settings.xml with the environment's existing proxy and trusted CA store. On this cloud machine validation uses:

```bash
JAVA_HOME=YOUR_FULL_JDK21_PATH \
MAVEN_USER_HOME=/workspace/.m2 \
MAVEN_OPTS='-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts' \
./mvnw -B -s /workspace/toolchains/maven-settings.xml \
  -Dmaven.repo.local=/workspace/.m2/repository verify
```

The settings file is machine-local, outside Git; TLS validation stays enabled. CRT runtime WSS proxy support is a separate live prerequisite: the probe accepts `AWS_IOT_PROXY_HOST` and `AWS_IOT_PROXY_PORT` for an HTTP CONNECT tunnel using supported CRT HttpProxyOptions. It does not automatically consume HTTPS_PROXY or embed proxy credentials. Use a supported tunnel or an authenticated laptop/network with outbound WSS443. Native self-test does not establish that live network path or SigV4 authentication works.
