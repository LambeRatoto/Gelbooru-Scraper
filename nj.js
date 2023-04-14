const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

function gelbooru(start, end) {
    return new Promise((resolve) => {

        function scrapePage(page) {
            const result = [];
            return axios.get(`https://gelbooru.com/index.php?page=post&s=list&tags=blue_archive+&pid=${page}`)
                .then(({
                    data
                }) => {
                    const $ = cheerio.load(data);
                    $('div.thumbnail-container > article.thumbnail-preview').each(function(a, b) {
                        const link = $(b).find('a').attr('href');
                        result.push(link);
                    });

                    // Map the array of links from the first scrape to an array of Promises that perform the second scrape


                    const scrapePromises = result.map((link, index) => {
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                axios.get(link)
                                    .then(({
                                        data
                                    }) => {
                                        const $ = cheerio.load(data);
                                        const scriptContent = $('script').text()
                                        const match = scriptContent.match(/https:\/\/[^\s]+\.(png|jpe?g|gif)/);
                                        const imageURL = match && match[0]; // extract the first match
                                        resolve(imageURL);
                                    })
                                    .catch(error => {
                                        reject(error);
                                    });
                            }, index * 500); // Add 1 second delay between each request
                        });
                    });


                    // Wait for all the Promises to complete and combine their results into a single array
                    return Promise.all(scrapePromises)
                        .then(results => {
                            return results.flat();
                        });
                });
        }


        console.time('Scraping Time'); // Start the timer
        const promises = [];
        for (let page = start; page <= end; page += 42) {
            promises.push(scrapePage(page));
        }

        // Wait for all the Promises to resolve with the scraped data using Promise.all()
        Promise.all(promises).then((results) => {
            const flattenedResults = results.flat();
            resolve(flattenedResults);
            console.timeEnd('Scraping Time'); // Stop the timer and print the elapsed time
        });
    });
}

gelbooru(0, 100).then((result) => {
    const fileContent = result.join('\n');
    fs.writeFileSync('bac.txt', fileContent);
    console.log(`Saved ${result.length} links to links.txt`);
}).catch((err) => {
    console.error('Failed to scrape links:', err);
});