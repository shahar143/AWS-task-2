const http = require('http');
const async = require('async');
const fs = require('fs');
const { performance } = require('perf_hooks');

const endPoint = 'Restau-LB8A1-TV8TG2KpNOa6-1104166507.us-east-1.elb.amazonaws.com';
const port = 80;

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

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

const insertRestaurants = async () => {
    const restaurants = [
        { name: 'Restaurant1', cuisine: 'Italian', rating: 4.5, region: 'North' },
        { name: 'Restaurant2', cuisine: 'Chinese', rating: 4.0, region: 'South' },
        { name: 'Restaurant3', cuisine: 'Mexican', rating: 3.5, region: 'East' },
        { name: 'Restaurant4', cuisine: 'Indian', rating: 4.8, region: 'West' },
        { name: 'Restaurant5', cuisine: 'Thai', rating: 4.2, region: 'Central' },
        { name: 'Restaurant6', cuisine: 'Japanese', rating: 4.3, region: 'North' },
        { name: 'Restaurant7', cuisine: 'French', rating: 4.7, region: 'South' },
        { name: 'Restaurant8', cuisine: 'Korean', rating: 4.1, region: 'East' },
        { name: 'Restaurant9', cuisine: 'Vietnamese', rating: 4.4, region: 'West' },
        { name: 'Restaurant10', cuisine: 'Spanish', rating: 3.9, region: 'Central' },
        { name: 'Restaurant11', cuisine: 'Greek', rating: 4.6, region: 'North' },
        { name: 'Restaurant12', cuisine: 'Turkish', rating: 3.8, region: 'South' },
        { name: 'Restaurant13', cuisine: 'Lebanese', rating: 4.0, region: 'East' },
        { name: 'Restaurant14', cuisine: 'Moroccan', rating: 4.5, region: 'West' },
        { name: 'Restaurant15', cuisine: 'American', rating: 4.3, region: 'Central' }
    ];

    for (const restaurant of restaurants) {
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

        if (response.statusCode !== 200) {
            console.error(`Failed to create ${restaurant.name}`);
        }
    }
};

const updateRestaurantRatings = async () => {
    const ratings = [
        { name: 'Restaurant1', rating: 4.5 },
        { name: 'Restaurant2', rating: 4.0 },
        { name: 'Restaurant3', rating: 3.5 },
        { name: 'Restaurant4', rating: 4.8 },
        { name: 'Restaurant5', rating: 4.2 },
        { name: 'Restaurant6', rating: 4.3 },
        { name: 'Restaurant7', rating: 4.7 },
        { name: 'Restaurant8', rating: 4.1 },
        { name: 'Restaurant9', rating: 4.4 },
        { name: 'Restaurant10', rating: 3.9 },
        { name: 'Restaurant11', rating: 4.6 },
        { name: 'Restaurant12', rating: 3.8 },
        { name: 'Restaurant13', rating: 4.0 },
        { name: 'Restaurant14', rating: 4.5 },
        { name: 'Restaurant15', rating: 4.3 }
    ];

    for (const { name, rating } of ratings) {
        const options = {
            hostname: endPoint,
            port: port,
            path: '/restaurants/rating',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await makeRequest(options, JSON.stringify({ name, rating }));
        console.log(`Updated rating for ${name}: Status Code: ${response.statusCode}`);

        if (response.statusCode !== 200) {
            console.error(`Failed to update rating for ${name}`);
        }
    }
};

const deleteRestaurants = async () => {
    const restaurantNames = [
        'Restaurant1',
        'Restaurant2',
        'Restaurant3',
        'Restaurant4',
        'Restaurant5',
        'Restaurant6',
        'Restaurant7',
        'Restaurant8',
        'Restaurant9',
        'Restaurant10',
        'Restaurant11',
        'Restaurant12',
        'Restaurant13',
        'Restaurant14',
        'Restaurant15'
    ];

    for (const name of restaurantNames) {
        const options = {
            hostname: endPoint,
            port: port,
            path: `/restaurants/${name}`,
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const response = await makeRequest(options);
        console.log(`Deleted ${name}: Status Code: ${response.statusCode}`);

        if (response.statusCode !== 200) {
            console.error(`Failed to delete ${name}`);
        }
    }
};

const getRestaurantByName = async (name) => {
    const start = performance.now();
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/${name}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    const end = performance.now();
    const timeTaken = end - start;
    console.log(`Fetched ${name}: Status Code: ${response.statusCode}, Time taken: ${timeTaken.toFixed(2)} ms`);

    return timeTaken;
};

const getTopRatedRestaurantsByRegion = async (region) => {
    const start = performance.now();
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/region/${region}?limit=5`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    const end = performance.now();
    const timeTaken = end - start;
    console.log(`Fetched top-rated restaurants by region (${region}): Status Code: ${response.statusCode}, Time taken: ${timeTaken.toFixed(2)} ms`);

    return timeTaken;
};

const getTopRatedRestaurantsByCuisine = async (cuisine, limit = 10) => {
    const start = performance.now();
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/cuisine/${cuisine}?limit=${limit}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    const end = performance.now();
    const timeTaken = end - start;
    console.log(`Fetched top-rated restaurants by cuisine (${cuisine}): Status Code: ${response.statusCode}, Time taken: ${timeTaken.toFixed(2)} ms`);

    return timeTaken;
};

const getTopRatedRestaurantsByRegionAndCuisine = async (region, cuisine, limit = 10) => {
    const start = performance.now();
    const options = {
        hostname: endPoint,
        port: port,
        path: `/restaurants/region/${region}/cuisine/${cuisine}?limit=${limit}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options);
    const end = performance.now();
    const timeTaken = end - start;
    console.log(`Fetched top-rated restaurants by region (${region}) and cuisine (${cuisine}): Status Code: ${response.statusCode}, Time taken: ${timeTaken.toFixed(2)} ms`);

    return timeTaken;
};

const setCacheUsage = async (useCache) => {
    const options = {
        hostname: endPoint,
        port: port,
        path: '/cache',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const response = await makeRequest(options, JSON.stringify({ useCache }));
    console.log(`Cache usage set to ${useCache}: Status Code: ${response.statusCode}`);

    if (response.statusCode !== 200) {
        console.error(`Failed to set cache usage to ${useCache}`);
    }
};

const runLoadTest = async (useCache) => {
    await setCacheUsage(useCache);

    const tasks = [];
    const times = {
        getRestaurantByName: [],
        getTopRatedRestaurantsByRegion: [],
        getTopRatedRestaurantsByCuisine: [],
        getTopRatedRestaurantsByRegionAndCuisine: []
    };

    const restaurantNames = ['Restaurant1', 'Restaurant2', 'Restaurant3', 'Restaurant4', 'Restaurant5'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const cuisines = ['Italian', 'Chinese', 'Mexican', 'Indian', 'Thai'];

    for (let i = 0; i < 200; i++) {
        const randomRestaurant = restaurantNames[Math.floor(Math.random() * restaurantNames.length)];
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];

        tasks.push(async () => {
            times.getRestaurantByName.push(await getRestaurantByName(randomRestaurant));
            times.getTopRatedRestaurantsByRegion.push(await getTopRatedRestaurantsByRegion(randomRegion));
            times.getTopRatedRestaurantsByCuisine.push(await getTopRatedRestaurantsByCuisine(randomCuisine));
            times.getTopRatedRestaurantsByRegionAndCuisine.push(await getTopRatedRestaurantsByRegionAndCuisine(randomRegion, randomCuisine));
        });
    }

    await async.parallelLimit(tasks, 4);

    return times;
};

const loadTest = async () => {
    await insertRestaurants();
    await sleep(5000); // Sleep for 5 seconds to allow cache to update
    await updateRestaurantRatings();

    console.log('Running load test with cache...');
    const timesWithCache = await runLoadTest(true);

    console.log('Running load test without cache...');
    const timesWithoutCache = await runLoadTest(false);

    await deleteRestaurants();

    const averageTime = (times) => times.reduce((a, b) => a + b, 0) / times.length;

    const results = {
        withCache: {
            getRestaurantByName: averageTime(timesWithCache.getRestaurantByName).toFixed(2),
            getTopRatedRestaurantsByRegion: averageTime(timesWithCache.getTopRatedRestaurantsByRegion).toFixed(2),
            getTopRatedRestaurantsByCuisine: averageTime(timesWithCache.getTopRatedRestaurantsByCuisine).toFixed(2),
            getTopRatedRestaurantsByRegionAndCuisine: averageTime(timesWithCache.getTopRatedRestaurantsByRegionAndCuisine).toFixed(2)
        },
        withoutCache: {
            getRestaurantByName: averageTime(timesWithoutCache.getRestaurantByName).toFixed(2),
            getTopRatedRestaurantsByRegion: averageTime(timesWithoutCache.getTopRatedRestaurantsByRegion).toFixed(2),
            getTopRatedRestaurantsByCuisine: averageTime(timesWithoutCache.getTopRatedRestaurantsByCuisine).toFixed(2),
            getTopRatedRestaurantsByRegionAndCuisine: averageTime(timesWithoutCache.getTopRatedRestaurantsByRegionAndCuisine).toFixed(2)
        }
    };

    console.log('Results:', JSON.stringify(results, null, 2));

    fs.writeFileSync('results.json', JSON.stringify(results, null, 2), 'utf8');
};

console.log('Starting Load Test');
loadTest();
