const spider = require("./spider.js");
const prettyjson = require("prettyjson");

async function run() {
    let articles = await spider.collectArticles();

    let pendings = [];
    let addCount = 0;

    for(let i = 0; i < articles.length; i++) {
        let a = articles[i];

        console.log(a.title);

        let content = await spider.getArticleContent(a.url);
        console.log(content);
    }
}

run();
