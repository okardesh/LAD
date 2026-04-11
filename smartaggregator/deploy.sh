#!/bin/sh

echo "Change mode 777"
chmod 777 /data/apps/smartaggregator/smartaggregator.jar
echo "Deploying..."
echo "Service stopping."
service smartaggregator stop
echo "Log deleting."
rm -Rf /var/log/smartaggregator.log
echo "Service starting."
service smartaggregator start
echo "Service started."
