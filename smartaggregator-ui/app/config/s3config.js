const AWS = require('aws-sdk');
const https = require('https');

const endpoint = process.env.AWS_ENDPOINT;
const options = {
    httpOptions: {
        agent: new https.Agent({
            rejectUnauthorized: false
        })
    },
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

if (endpoint) {
    options.s3BucketEndpoint = true;
    options.endpoint = endpoint;
}

AWS.config.update(options);

const config = new AWS.S3();

const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: '', // pass key
};

const s3 = {};
s3.config = config;
s3.params = params;

s3.getImage = async function (name) {
    if (!name) return;

    params.Key = name;
    return config.getObject(params)
        .promise()
        .then(img => Buffer.from(img.Body).toString('base64'))
        .catch(e => { console.error("S3 Service getImage Exception -> ", e); });
};

module.exports = s3;
