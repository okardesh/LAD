#!/bin/sh

cd /data/apps/smartaggregator-ui
echo "Change mode 777"
chmod 777 smartaggregator-ui.zip
echo "Deleting app folder"
rm -rf app
echo "Deploying..."
unzip smartaggregator-ui.zip -d ./app
cd ./app
echo "Installing..."
npm install
echo "Service stopping."
pm2 stop app.js
echo "Service starting."
pm2 start app.js
echo "Service started."
