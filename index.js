const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const formidable = require('formidable');
var im = require('imagemagick');
const fs = require('fs');
const mv = require('mv');
const app = express();
var multer = require('multer');
var upload = multer().single('file');
const AWS = require('aws-sdk');
const cred = require("./config/cred");
const s3 = new AWS.S3({
    accessKeyId: cred.aws.accessKeyId,
    secretAccessKey: cred.aws.secretAccessKey
});
const USERS_TABLE = process.env.USERS_TABLE;

const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
    dynamoDb = new AWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
    })
    console.log(dynamoDb);
} else {
    dynamoDb = new AWS.DynamoDB.DocumentClient();
};

app.use(bodyParser.json({ strict: false }));
let delay = ms => new Promise(r => setTimeout(r, ms));
app.post('/upload', function (req, res) {
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.parse(req, async function (err, fields, files) {
        const fileName = files.file.name;
        var oldpath = files.file.path;
        var imagepath = "./uploads/" + files.file.name;
        fs.rename(oldpath, imagepath, async function (err) {
            if (err) {
                return res.send('Error Uploading Data: ' + JSON.stringify(err) + '\n' + JSON.stringify(err.stack));
            }
            fs.readFile(oldpath, function (err, data) {
                if (err) {
                    console.log('> FileServer.jsx | route: "/files/upload" | err:', err.message);
                    return res.status(201).json({ message: err.message });
                }
                if (data) {
                    const params = {
                        Key: imagepath,
                        Bucket: `${cred.aws.bucketId}`, //set somewhere
                        Body: data, //req is a stream,
                        ACL: 'public-read',
                        //ContentType: 'image/jpeg'
                    };
                    s3.upload(params, async (err, data) => {
                        if (err) {
                            console.log("error in uploading image-----------", err);
                            res.send('Error Uploading Data: ' + JSON.stringify(err) + '\n' + JSON.stringify(err.stack));
                        }
                        else {
                            im.readMetadata(imagepath, function (err, metadata) {
                                if (err) {
                                    console.log(err.message);
                                    return res.status(201).json({ message: err.message });
                                }
                                console.log('metadata ', metadata);
                                console.log('Exif ', metadata.exif);
                                return res.status(200).json({ message: "success", data: metadata });
                            })

                        }
                    });
                }

            });
        });
    })

})
app.get('/', function (req, res) {
    res.send('Hello World!')
})

// Get User endpoint
app.get('/users/:userId', function (req, res) {
    const params = {
        TableName: USERS_TABLE,
        Key: {
            userId: req.params.userId,
        },
    }

    dynamoDb.get(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: 'Could not get user' });
        }
        if (result.Item) {
            const { userId, name } = result.Item;
            res.json({ userId, name });
        } else {
            res.status(404).json({ error: "User not found" });
        }
    });
})

// Create User endpoint
app.post('/users', function (req, res) {
    const { userId, name } = req.body;
    if (typeof userId !== 'string') {
        res.status(400).json({ error: '"userId" must be a string' });
    } else if (typeof name !== 'string') {
        res.status(400).json({ error: '"name" must be a string' });
    }

    const params = {
        TableName: USERS_TABLE,
        Item: {
            userId: userId,
            name: name,
        },
    };

    dynamoDb.put(params, (error) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: 'Could not create user' });
        }
        res.json({ userId, name });
    });
})

module.exports.handler = serverless(app);

// AKIA42OK4NRL4EPWPEVJ
// LX9Jc8iYebVQ2ONnUoh8n+RcxU9ri+qvWf009+ts



/*
const dynamo = new AWS.DynamoDB.DocumentClient();
exports.handler = async (event, context) => {
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json"
    };

    try {
        switch (event.routeKey) {
            case "DELETE /items/{id}":
                await dynamo
                    .delete({
                        TableName: "http-crud-tutorial-items",
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                break;
            case "GET /items/{id}":
                body = await dynamo
                    .get({
                        TableName: "http-crud-tutorial-items",
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                break;
            case "GET /items":
                body = await dynamo.scan({ TableName: "http-crud-tutorial-items" }).promise();
                break;
            case "PUT /items":
                let requestJSON = JSON.parse(event.body);
                await dynamo
                    .put({
                        TableName: "http-crud-tutorial-items",
                        Item: {
                            id: requestJSON.id,
                            price: requestJSON.price,
                            name: requestJSON.name
                        }
                    })
                    .promise();
                body = `Put item ${requestJSON.id}`;
                break;
            default:
                throw new Error(`Unsupported route: "${event.routeKey}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = err.message;
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};
*/