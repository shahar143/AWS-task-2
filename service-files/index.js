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
    const restaurant = req.body;
    const cacheKey = `restaurant_${restaurant.name}`;
    try {
        // Check if restaurant exists in the database
        const getParams = {
            TableName: TABLE_NAME,
            Key: { resturant_name: restaurant.name }
        };
        const { Item } = await docClient.get(getParams).promise(); 
        if (Item) {
            return res.status(409).send({ success: false , message: 'Restaurant already exists' });
        }

        // Add restaurant to the database
        const putParams = {
            TableName: TABLE_NAME,
            Item: {
                resturant_name : restaurant.name,
                region: restaurant.region,
                cuisine: restaurant.cuisine,
                rating: 0 // Initialize with zero rating
            }
        };
        await docClient.put(putParams).promise();

        // Update cache with new restaurant data
        if (USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (!cachedData) {
                const resturant = {
                    name: restaurant.name,
                    cuisine: restaurant.cuisine,
                    rating: 0,
                    region: restaurant.region
                }
                await memcachedActions.addRestaurants(cacheKey, resturant); 
            }
        }

        res.status(200).send({ success: true });
    } catch (err) {
        console.log("Error:", err);
        res.status(500).send("Error adding restaurant");
    }
});


app.get('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    const cacheKey = `restaurant_${restaurantName}`;

    try {
        // Check if restaurant data is in cache
        if (USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                return res.status(200).send(cachedData);
            }
        }

        // If not in cache, retrieve from DynamoDB
        const getParams = {
            TableName: TABLE_NAME,
            Key: { resturant_name: restaurantName }
        };

        const { Item } = await docClient.get(getParams).promise();

        if (Item) {
            const restaurantData = {
                name: restaurantName,
                cuisine: Item.cuisine,
                rating: Item.rating,
                region: Item.region
            };
            
            if (USE_CACHE){
                // Store retrieved data in cache
                await memcachedActions.addRestaurants(cacheKey, restaurantData);
            }

            //match resturantData to return formant

            console.log(restaurantData);
            return res.status(200).send(restaurantData);
        } else {
            return res.status(404).send("Restaurant not found");
        }
    } catch (error) {
        console.error("Error fetching restaurant:", error);
        return res.status(500).send("Error fetching restaurant");
    }
});


app.delete('/restaurants/:restaurantName', async (req, res) => {
    const restaurantName = req.params.restaurantName;
    const cacheKey = `restaurant_${restaurantName}`;

    const deleteParams = {
        TableName: TABLE_NAME,
        Key: { resturant_name: restaurantName }
    };

    try {
        // Check if the restaurant exists
        const { Item } = await docClient.get({ TableName: TABLE_NAME, Key: { resturant_name: restaurantName } }).promise();
        if (!Item) {
            return res.status(404).send({ success: false, message: 'Restaurant not found' });
        }

        // Delete the restaurant from DynamoDB
        await docClient.delete(deleteParams).promise();

        if (USE_CACHE){
            // Remove the restaurant from the cache
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                await memcachedActions.deleteRestaurants(cacheKey);
            }
        }

        return res.status(200).send({ success: true });
    } catch (error) {
        console.error("Error deleting restaurant:", error);
        return res.status(500).send("Error deleting restaurant");
    }
});



app.post('/restaurants/rating', async (req, res) => {
    const restaurantName = req.body.name;
    const newRating = req.body.rating;
    const cacheKey = `restaurant_${restaurantName}`;

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

        if (USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                await memcachedActions.deleteRestaurants(cacheKey);
                // Update the cache with the new rating
                const updatedRestaurantData = {
                    name: restaurantName,
                    cuisine: Item.cuisine,
                    rating: updatedRating,
                    region: Item.region
                };
                await memcachedActions.addRestaurants(cacheKey, updatedRestaurantData);
            }
        }

        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Error updating rating:", error);
        res.status(500).send("Error updating rating");
    }
});


app.get('/restaurants/cuisine/:cuisine', async (req, res) => {
    const cuisine = req.params.cuisine;
    let limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;  // Default to 10 if limit is not specified
    const maxLimit = 100;
    limit = limit > maxLimit ? maxLimit : limit;  // Cap the limit to maxLimit
    cacheKey = 'cuisine_${cuisine}_limit_${limit}'

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
        if(USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                return res.status(200).send(cachedData);
            }
        }
        const data = await docClient.query(params).promise();
        
        if (data.Items) {
            // Map the response to match the expected format
            const result = data.Items.map(item => ({
                name: item.resturant_name,
                cuisine: item.cuisine,
                rating: item.rating,
                region: item.region
            }));

            if (USE_CACHE){ 
                // Store the result in cache
                await memcachedActions.addRestaurants(cacheKey, result);
            }
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
    cacheKey = 'region_${region}_limit_${limit}'

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
        if (USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                return res.status(200).send(cachedData);
            }
        }
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

            if (USE_CACHE){
                // Store the result in cache
                await memcachedActions.addRestaurants(cacheKey, result);
            }

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
    cacheKey = 'region_${region}_cuisine_${cuisine}_limit_${limit}'

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
        if (USE_CACHE){
            const cachedData = await memcachedActions.getRestaurants(cacheKey);
            if (cachedData) {
                return res.status(200).send(cachedData);
            }
        }

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

            if (USE_CACHE){
                // Store the result in cache
                await memcachedActions.addRestaurants(cacheKey, result);
            }

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