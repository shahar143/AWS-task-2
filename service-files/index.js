const express = require('express');
const AWS = require('aws-sdk');
const RestaurantsMemcachedActions = require('./model/restaurantsMemcachedActions');
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
//const ddb = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = new AWS.DynamoDB.DocumentClient();


const app = express();
app.use(express.json());

const MEMCACHED_CONFIGURATION_ENDPOINT = process.env.MEMCACHED_CONFIGURATION_ENDPOINT;
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION;
const USE_CACHE = process.env.USE_CACHE === 'true';

const memcachedActions = new RestaurantsMemcachedActions(MEMCACHED_CONFIGURATION_ENDPOINT);

app.get('/', (req, res) => {
    const response = {
        MEMCACHED_CONFIGURATION_ENDPOINT: MEMCACHED_CONFIGURATION_ENDPOINT,
        TABLE_NAME: TABLE_NAME,
        AWS_REGION: AWS_REGION,
    };
    res.send(response);
});

app.post('/restaurants', async (req, res) => {
    const resturant = req.body;
    try {
        // Check if restaurant exists in the database
        const getParams = {
            TableName: TABLE_NAME,
            Key: { resturant_name: resturant.name }
        };
        const { Item } = await docClient.get(getParams).promise(); 
        if (Item) {
            return res.status(409).send({ success: false , message: 'Restaurant already exists' });
        }

        // Add restaurant to the database
        const putParams = {
            TableName: TABLE_NAME,
            Item: {
                resturant_name : resturant.name,
                region: resturant.region,
                cuisine: resturant.cuisine,
                rating: 0 // Initialize with zero rating
            }
        };
        await docClient.put(putParams).promise();

        res.status(200).send({ success: true });
    } catch (err) {
        console.log("Error:", err);
        res.status(500).send("Error adding restaurant");
    }
});

app.get('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;

    // Check if restaurant exists in the database
    const getParams = {
        TableName: TABLE_NAME,
        Key: { resturant_name: restaurantName }
    };
    const { Item } = await docClient.get(getParams).promise(); 
    if (Item) {
        return res.status(200).send({ name: restaurantName, cuisine: Item.cuisine, rating: Item.rating, region: Item.region })
    }
});

app.delete('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    
    // Students TODO: Implement the logic to delete a restaurant by name
    res.status(404).send("need to implement");
});

app.post('/restaurants/rating', async (req, res) => {
    const restaurantName = req.body.name;
    const rating = req.body.rating;

    const updateParams = {
        TableName: TABLE_NAME,
        Key: { resturant_name: restaurantName },
        UpdateExpression: 'set rating = :r',
        ExpressionAttributeValues: { ':r': rating },
        ReturnValues: "UPDATED_NEW"
    };

    try {
        // Attempt to update the rating
        await docClient.update(updateParams).promise();
        res.status(200).send({ success: true });
    } catch (error) {
        // Handle possible errors, such as the restaurant not being found
        console.error("Error updating rating:", error);
        res.status(500).send("Error updating rating");
    }
    
    // Students TODO: Implement the logic to add a rating to a restaurant
    res.status(404).send("need to implement");
});

app.get('/restaurants/cuisine/:cuisine', async (req, res) => {
    const cuisine = req.params.cuisine;
    let limit = req.query.limit;
    
    // Students TODO: Implement the logic to get top rated restaurants by cuisine
    res.status(404).send("need to implement");
});

app.get('/restaurants/region/:region', async (req, res) => {
    const region = req.params.region;
    let limit = req.query.limit;
    
    // Students TODO: Implement the logic to get top rated restaurants by region
    res.status(404).send("need to implement");
});

app.get('/restaurants/region/:region/cuisine/:cuisine', async (req, res) => {
    const region = req.params.region;
    const cuisine = req.params.cuisine;

    // Students TODO: Implement the logic to get top rated restaurants by region and cuisine
    res.status(404).send("need to implement");
});

app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});

module.exports = { app };