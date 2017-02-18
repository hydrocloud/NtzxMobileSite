const mongoClient = require("mongodb").MongoClient;
const spider = require("./spider.js");
const uuid = require("uuid");
const express = require("express");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const WEB_DIR = "../frontend/web/";
const IMG_PREFIX = "http://www.ntzx.cn";
let db;
let app = express();
let templates = {};

function wrap(f) {
    return async function (req, resp) {
        try {
            await f(req, resp);
        } catch (e) {
            resp.json({
                "err": 1,
                "msg": e
            });
        }
    }
}

async function getArticleList() {
    let articles = await db.collection("articles").find({}).sort({
        "date": -1
    }).toArray();

    return articles;
}

async function getArticleById(id) {
    assert(typeof (id) == "string");

    let article = await db.collection("articles").find({
        "id": id
    }).limit(1).toArray();
    article = article[0];

    return article;
}

function replaceResourceUrls(content) {
    let ret = "";
    let buf = "";
    let state = 0;

    const imgSuffixes = [
        ".jpg",
        ".png",
        ".jpeg",
        ".gif",
        ".JPG",
        ".PNG",
        ".JPEG",
        ".GIF"
    ];

    for(let i = 0; i < content.length; i++) {
        switch(state) {
            case 0:
                if(content[i] == '[') {
                    state = 1;
                    buf = "";
                }
                else ret += content[i];
                break;

            case 1:
                if(content[i] == ']') {
                    let isImage = false;
                    for(let j = 0; j < imgSuffixes.length; j++) {
                        if(buf.endsWith(imgSuffixes[j])) {
                            isImage = true;
                            break;
                        }
                    }
                    if(isImage) {
                        ret += `<img class="article-image" src="${IMG_PREFIX + buf}" />`;
                    } else {
                        ret += "[" + buf + "]";
                    }
                    buf = "";
                    state = 0;
                } else {
                    buf += content[i];
                }
                break;
            default: // this shouldn't happen
                break
        }
    }

    return ret;
}

app.use("/web/", express.static(path.join(__dirname, WEB_DIR)));

app.get("/", (req, resp) => {
    resp.redirect("/article/list");
});

app.get("/article/list", wrap(async function (req, resp) {
    let articles = await getArticleList();
    articles = articles.map(v => {
        return `
            <tr>
                <td><a href="/article/by_id/${v.id}">${v.title}</a></td>
                <td>${v.date}</td>
            </tr>
        `;
    }).join("");
    let content = `
        <table class="table">
            <thead>
                <tr>
                    <th>
                        标题
                    </th>
                    <th>
                        日期
                    </th>
                </tr>
            </thead>
            <tbody>
                ${articles}
            </tbody>
        </table>
    `;
    resp.send(templates["main"].replace("{{PAGE_CONTENT}}", content));
}));

app.get("/article/by_id/:id", wrap(async function (req, resp) {
    assert(req.params && typeof (req.params.id) == "string");

    let target = await getArticleById(req.params.id);

    let content = target.content.split("\n").join("<br />");
    content = replaceResourceUrls(content);

    let ret = `
        <h3>${target.title}</h3>
        <p class="article-date">${target.date}</p>
        <hr />
        <p class="article-content">${content}</p>
    `;
    resp.send(templates["main"].replace("{{PAGE_CONTENT}}", ret));
}));

async function run() {
    db = await mongoClient.connect("mongodb://127.0.0.1:27017/NtzxMobileSite");
    templates["main"] = fs.readFileSync(path.join(__dirname, WEB_DIR, "index.html"), "utf-8");

    app.listen(8195);
}

run();
