const http = require('http');
const assert = require('assert');

const endPoint = 'Restau-LB8A1-b3gip67oiQBm-557461504.us-east-1.elb.amazonaws.com';
const port = 80;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to make HTTP requests
const makeRequest = (options, postData = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data: data });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
};

// Function to create a restaurant
const createRestaurant = async (restaurant) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: '/restaurants',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options, JSON.stringify(restaurant));
    console.log(`Created ${restaurant.name}: Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for ${restaurant.name}`);
    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.success, true, `Expected success to be true for ${restaurant.name}`);
};

// Function to get a restaurant by name
const getRestaurantByName = async (name) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/${name}`,
        method: 'GET'
    };

    const response = await makeRequest(options);
    console.log(`Fetched ${name}: Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for ${name}`);
    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.name, name, `Expected name to be ${name}`);
};

// Function to add a rating to a restaurant
const addRatingToRestaurant = async (name, rating) => {
    const data = { name, rating };
    const options = {
        hostname: endPoint,
        port: port,
        path: '/restaurants/rating',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options, JSON.stringify(data));
    console.log(`Rated ${name}: Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for rating ${name}`);
    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.success, true, `Expected success to be true for rating ${name}`);
};

// Function to delete a restaurant
const deleteRestaurantByName = async (name) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/${name}`,
        method: 'DELETE'
    };

    const response = await makeRequest(options);
    console.log(`Deleted ${name}: Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for deleting ${name}`);
    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.success, true, `Expected success to be true for deleting ${name}`);
};

// Function to get top-rated restaurants by cuisine
const getTopRatedRestaurantsByCuisine = async (cuisine, limit = 10) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/cuisine/${cuisine}?limit=${limit}`,
        method: 'GET'
    };

    const response = await makeRequest(options);
    console.log(`Fetched top-rated restaurants by cuisine (${cuisine}): Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for fetching by cuisine ${cuisine}`);
    const responseData = JSON.parse(response.data);
    assert(Array.isArray(responseData), `Expected response data to be an array for cuisine ${cuisine}`);
    responseData.forEach(restaurant => {
        assert.strictEqual(restaurant.cuisine, cuisine, `Expected cuisine to be ${cuisine}`);
    });
};

// Function to get top-rated restaurants by region
const getTopRatedRestaurantsByRegion = async (region, limit = 10) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/region/${region}?limit=${limit}`,
        method: 'GET'
    };

    const response = await makeRequest(options);
    console.log(`Fetched top-rated restaurants by region (${region}): Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for fetching by region ${region}`);
    const responseData = JSON.parse(response.data);
    assert(Array.isArray(responseData), `Expected response data to be an array for region ${region}`);
    responseData.forEach(restaurant => {
        assert.strictEqual(restaurant.region, region, `Expected region to be ${region}`);
    });
};

// Function to get top-rated restaurants by region and cuisine
const getTopRatedRestaurantsByRegionAndCuisine = async (region, cuisine, limit = 10) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/region/${region}/cuisine/${cuisine}?limit=${limit}`,
        method: 'GET'
    };

    const response = await makeRequest(options);
    console.log(`Fetched top-rated restaurants by region (${region}) and cuisine (${cuisine}): Status Code: ${response.statusCode}`);

    assert.strictEqual(response.statusCode, 200, `Expected status code to be 200 for fetching by region ${region} and cuisine ${cuisine}`);
    const responseData = JSON.parse(response.data);
    assert(Array.isArray(responseData), `Expected response data to be an array for region ${region} and cuisine ${cuisine}`);
    responseData.forEach(restaurant => {
        assert.strictEqual(restaurant.region, region, `Expected region to be ${region}`);
        assert.strictEqual(restaurant.cuisine, cuisine, `Expected cuisine to be ${cuisine}`);
    });
};

// Main test function
const testRestaurantOperations = async () => {
    const totalStartTime = process.hrtime();

    const restaurants = [
        { name: 'Restaurant1', region: 'TelAviv', cuisine: 'Cafe' },
        { name: 'Restaurant2', region: 'CentralDistrict', cuisine: 'Bistro' },
        { name: 'Restaurant3', region: 'North', cuisine: 'Pub' },
        { name: 'Restaurant4', region: 'Ariel', cuisine: 'Diner' },
        { name: 'Restaurant5', region: 'South', cuisine: 'Restaurant' },
    ];

    try {
        for (const restaurant of restaurants) {
            await createRestaurant(restaurant);
        }

        // Sleep for 5 seconds to allow cache to reset
        console.log('Waiting for cache to reset...');
        await sleep(5000);

        for (const restaurant of restaurants) {
            await getRestaurantByName(restaurant.name);
            await addRatingToRestaurant(restaurant.name, 4.5);
        }

        // Test complex API calls
        await getTopRatedRestaurantsByCuisine('Cafe');
        await getTopRatedRestaurantsByRegion('TelAviv');
        await getTopRatedRestaurantsByRegionAndCuisine('TelAviv', 'Cafe');

        for (const restaurant of restaurants) {
            await deleteRestaurantByName(restaurant.name);
        }

        const totalEndTime = process.hrtime(totalStartTime);
        const totalElapsedTimeInMs = (totalEndTime[0] * 1e9 + totalEndTime[1]) / 1e6;
        console.log(`Total Elapsed Time for all operations: ${totalElapsedTimeInMs} ms`);

    } catch (error) {
        console.error('Error during restaurant operations:', error);
    }
};

// Run the test flow
testRestaurantOperations();
