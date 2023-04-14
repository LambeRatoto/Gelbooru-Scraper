const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');
const fs = require('fs');

function gelbooru(tag, end) {
    return new Promise((resolve) => {

        function scrapePage(page) {
            const result = [];
            return axios.get(`https://gelbooru.com/index.php?page=post&s=list&tags=${tag.replace(/\s+/g, '+')}+&pid=${page}`)
                .then(({
                    data
                }) => {
                    const $ = cheerio.load(data);
                    $('div.thumbnail-container > article.thumbnail-preview').each(function(a, b) {
                        const link = $(b).find('a').attr('href');
                        result.push(link);
                    });


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
                            }, index * 500);
                        });
                    });


                    return Promise.all(scrapePromises)
                        .then(results => {
                            results = results.flat().filter(result => result !== null);
                            return results.flat();
                        });
                });
        }


        console.time('Scraping Time');
        const promises = [];
        for (let page = 0; page <= end; page += 42) {
            promises.push(scrapePage(page));
        }

        Promise.all(promises).then((results) => {
            const flattenedResults = results.flat();
            resolve(flattenedResults);
            console.timeEnd('Scraping Time');
        });
    });
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


rl.question('Tag?\nSpasi untuk beda tag\n ', (tag) => {
    rl.question('Banyaknya?\n', (hm) => {
        console.log("Tunggu Sebentar....")
gelbooru(tag, 100).then((result) => {
    const fileContent = result.join('\n');
    fs.writeFileSync(`./output/${tag.replace(/\s+/g, '_')}.txt`, fileContent);
    console.log(`Saved ${result.length} links to ${tag.replace(/\s+/g, '_')}.txt`);
}).catch((err) => {
    console.error('Failed to scrape links:', err);
});
rl.close();
});
});