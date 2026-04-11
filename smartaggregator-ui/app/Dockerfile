# Start with a base image containing Node runtime
FROM node:8-alpine

# Update & Add to operation system
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*

# Install Certificates
COPY ./uat_ca.cer /usr/local/share/ca-certificates/uat_ca.cer
RUN update-ca-certificates

# Create a user and a group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy & Set work directory
COPY . /home/app/ui
WORKDIR /home/app/ui

# Change owner of app directory
RUN chown -R appuser:appgroup /home/app/ui

# Support Arbitrary User IDs
RUN chgrp -R 0 /home/app/ui && \
    chmod -R g+rwX /home/app/ui

# Continue as 'appuser'
USER appuser

# Delete & create uploads
RUN rm -rf uploads
RUN mkdir uploads

# Install packages
RUN npm install

# Add maintainer Info
LABEL maintainer="linktera.com.tr"

# Run app
CMD ["npm", "start"]

# Make port 8082 available to the world outside this container
EXPOSE 8082:8082