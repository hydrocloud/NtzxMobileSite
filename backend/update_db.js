const mongoClient = require("mongodb").MongoClient;
const spider = require("./spider.js");
const uuid = require("uuid");

async function run() {
    let db = await mongoClient.connect("mongodb://127.0.0.1:27017/NtzxMobileSite");

    let articles = await spider.collectArticles();

    let pendings = [];
    let addCount = 0;

    for(let i = 0; i < articles.length; i++) {
        let a = articles[i];

        pendings.push((async function() {
            let current = await db.collection("articles").find({
                "url": a.url
            }).limit(1).toArray();
            if(current && current.length) return;

            let content, title;
            try {
                let d = await spider.getArticleData(a.url);
                content = d.content;
                title = d.title;
            } catch(e) {
                content = "";
                title = a.title;
            }

            let id = uuid.v4();

            await db.collection("articles").insertOne({
                "id": id,
                "url": a.url,
                "title": title,
                "date": a.date,
                "content": content
            });
            addCount++;
        })());
    }

    for(let i = 0; i < articles.length; i++) await pendings[i];

    console.log("All done. " + addCount + " new articles in total.");
    process.exit(0);
}

run();
