const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Credentials come from the environment only. If they are unset, the AWS SDK falls back to
// its default credential chain (shared profile, IAM role, etc.).
const awsConfig = { region: process.env.AWS_REGION || 'ap-southeast-2' };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}
AWS.config.update(awsConfig);

// Create an instance of the S3 service
const s3 = new AWS.S3();

const uploadFiles = async (req, res) => {
    try {
        const fileData = req.file;
        if (!fileData) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }
        const fileId = uuidv4();
        const params = {
            Bucket: 'rquest',
            Key: fileId,
            Body: fileData.buffer
        };
        const data = await s3.upload(params).promise();
        res.status(200).json({ success: true, data: data });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: error.message });
    }
}

// Modified uploadFileToS3 function
const uploadFileToS3 = async (fileData) => {
    try {
        const params = {
            Bucket: 'rquest',
            Key: fileData.originalname,
            Body: fileData.buffer
        };
        // Upload file to S3
        const data = await s3.upload(params).promise();
        return data;
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw error;
    }
}


module.exports = uploadFiles;