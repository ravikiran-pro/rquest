const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({
    accessKeyId: 'AKIATCKARYTT4CXRHCH4',
    secretAccessKey: '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',
    region: 'ap-southeast-2'
});

// Create an instance of the S3 service
const s3 = new AWS.S3();

const uploadFiles = async (req, res) => {
    try {
        const fileData = req.file;
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