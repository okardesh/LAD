#!/bin/sh
set -eu

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
JAR_PATH="${1:-$BASE_DIR/smartaggregator.jar}"
CONF_PATH="${2:-$BASE_DIR/config/application-local.properties}"

if [ ! -f "$JAR_PATH" ]; then
  echo "Backend jar not found: $JAR_PATH"
  echo "Place smartaggregator.jar in $BASE_DIR or pass jar path as arg1."
  exit 1
fi

if [ ! -f "$CONF_PATH" ]; then
  echo "Config file not found: $CONF_PATH"
  echo "Pass config path as arg2."
  exit 1
fi

JAVA_OPTS_DEFAULT="-Xmx2048m -Xms512m"
JAVA_OPTS="${JAVA_OPTS:-$JAVA_OPTS_DEFAULT}"

echo "Starting backend"
echo "JAR: $JAR_PATH"
echo "Config: $CONF_PATH"

exec java $JAVA_OPTS -jar "$JAR_PATH" --spring.config.location="file:$CONF_PATH"
