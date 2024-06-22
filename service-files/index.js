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
    const newRating = req.body.rating;

    // First, fetch the current restaurant data
    const getParams = {
        TableName: TABLE_NAME,
        Key: { resturant_name: restaurantName }
    };

    try {
        const { Item } = await docClient.get(getParams).promise();
        
        if (!Item) {
            return res.status(404).send({ success: false, message: 'Restaurant not found' });
        }

        // Calculate the new average rating
        const currentRating = Item.rating || 0;
        const numRatings = Item.num_ratings || 0;
        const updatedNumRatings = numRatings + 1;
        const updatedRating = ((currentRating * numRatings) + newRating) / updatedNumRatings;

        // Update the restaurant with the new rating and increment the number of ratings
        const updateParams = {
            TableName: TABLE_NAME,
            Key: { resturant_name: restaurantName },
            UpdateExpression: 'set rating = :r, num_ratings = :n',
            ExpressionAttributeValues: {
                ':r': updatedRating,
                ':n': updatedNumRatings
            },
            ReturnValues: "UPDATED_NEW"
        };

        await docClient.update(updateParams).promise();
        res.status(200).send({ success: true });
    } catch (error) {
        // Handle possible errors
        console.error("Error updating rating:", error);
        res.status(500).send("Error updating rating");
    }
});

app.get('/restaurants/cuisine/:cuisine', async (req, res) => {
    const cuisine = req.params.cuisine;
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;  // Default to 10 if limit is not specified
    const maxLimit = 100;
    limit = limit > maxLimit ? maxLimit : limit;  // Cap the limit to maxLimit

    const params = {
        TableName: TABLE_NAME,
        IndexName: 'cuisine-index',
        KeyConditionExpression: 'cuisine = :c',
        ExpressionAttributeValues: {
            ':c': cuisine
        },
        Limit: limit,
        ScanIndexForward: false  // To get top rated restaurants, we need to sort by rating in descending order
    };

    try {
        const data = await docClient.query(params).promise();
        
        if (data.Items) {
            // Map the response to match the expected format
            const result = data.Items.map(item => ({
                name: item.resturant_name,
                cuisine: item.cuisine,
                rating: item.rating,
                region: item.region
            }));
            return res.status(200).send(result);
        } else {
            return res.status(404).send({ success: false, message: 'No restaurants found for the specified cuisine' });
        }
    } catch (error) {
        console.error("Error fetching restaurants by cuisine:", error);
        res.status(500).send("Error fetching restaurants by cuisine");
    }
});

app.get('/restaurants/region/:region', async (req, res) => {
    const region = req.params.region;
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;  // Default to 10 if limit is not specified
    const maxLimit = 100;
    limit = limit > maxLimit ? maxLimit : limit;  // Cap the limit to maxLimit

    const params = {
        TableName: TABLE_NAME,
        FilterExpression: '#r = :r',
        ExpressionAttributeNames: {
            '#r': 'region'
        },
        ExpressionAttributeValues: {
            ':r': region
        }
    };

    try {
        const data = await docClient.scan(params).promise();

        if (data.Items) {
            // Sort the restaurants by rating in descending order
            const sortedRestaurants = data.Items.sort((a, b) => b.rating - a.rating);

            // If limit is provided, slice the array to the specified limit
            const limitedRestaurants = limit ? sortedRestaurants.slice(0, limit) : sortedRestaurants;

            // Map the response to match the expected format
            const result = limitedRestaurants.map(item => ({
                name: item.resturant_name,
                cuisine: item.cuisine,
                rating: item.rating,
                region: item.region
            }));

            return res.status(200).send(result);
        } else {
            return res.status(404).send({ success: false, message: 'No restaurants found for the specified region' });
        }
    } catch (error) {
        console.error("Error fetching restaurants by region:", error);
        res.status(500).send("Error fetching restaurants by region");
    }
});


app.get('/restaurants/region/:region/cuisine/:cuisine', async (req, res) => {
    const region = req.params.region;
    const cuisine = req.params.cuisine;
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;  // Default to 10 if limit is not specified
    const maxLimit = 100;
    limit = limit > maxLimit ? maxLimit : limit;  // Cap the limit to maxLimit

    const params = {
        TableName: TABLE_NAME,
        FilterExpression: '#r = :r and #c = :c',
        ExpressionAttributeNames: {
            '#r': 'region',
            '#c': 'cuisine'
        },
        ExpressionAttributeValues: {
            ':r': region,
            ':c': cuisine
        }
    };

    try {
        const data = await docClient.scan(params).promise();

        if (data.Items) {
            // Sort the restaurants by rating in descending order
            const sortedRestaurants = data.Items.sort((a, b) => b.rating - a.rating);

            // If limit is provided, slice the array to the specified limit
            const limitedRestaurants = limit ? sortedRestaurants.slice(0, limit) : sortedRestaurants;

            // Map the response to match the expected format
            const result = limitedRestaurants.map(item => ({
                name: item.resturant_name,
                cuisine: item.cuisine,
                rating: item.rating,
                region: item.region
            }));

            return res.status(200).send(result);
        } else {
            return res.status(404).send({ success: false, message: 'No restaurants found for the specified region and cuisine' });
        }
    } catch (error) {
        console.error("Error fetching restaurants by region and cuisine:", error);
        res.status(500).send("Error fetching restaurants by region and cuisine");
    }
});

app.listen(80, () => {
    console.log('Server is running on http://localhost:80');
});

module.exports = { app };