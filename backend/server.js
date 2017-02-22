const mongoClient = require("mongodb").MongoClient;
const spider = require("./spider.js");
const uuid = require("uuid");
const express = require("express");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const servicehub = require("servicehub-sdk");
const ffi = require("ffi");
const ref = require("ref");
const ArrayType = require("ref-array");

let CharArray = ArrayType(ref.types.char);
let lib = ffi.Library("../backend_helper/libmain.so", {
    "replace_resource_urls": ["int", ["string", CharArray, "long long"]]
});
let servicehubContext = new servicehub.ServiceHubContext("172.16.8.1:6619");

const WEB_DIR = "../frontend/web/";
const IMG_PREFIX = "http://www.ntzx.cn";
let db;
let app = express();
let templates = {};

function wrap(f) {
    return async function (req, resp) {
        try {
            req.startTime = Date.now();
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

function replaceResourceUrls(input) {
    return new Promise((cb, reject) => {
        assert(typeof(input) == "string");

        let retBuf = new CharArray(input.length * 16);

        lib.replace_resource_urls.async(input, retBuf, retBuf.length, (err, len) => {
            if(err) {
                return reject(err);
            }

            let newBuf;

            try {
                newBuf = new Buffer(len);
                retBuf.buffer.copy(newBuf, 0, 0, len);
            } catch(e) {
                return reject(e);
            }

            cb(newBuf.toString("utf-8"));
        });
    });
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
    resp.send(templates["main"]
        .replace("{{PAGE_CONTENT}}", content)
        .replace("{{PAGE_TITLE}}", "文章列表")
        .replace("{{RENDER_TIME}}", ((Date.now() - req.startTime) / 1000).toString())
    );
}));

app.get("/article/by_id/:id", wrap(async function (req, resp) {
    assert(req.params && typeof (req.params.id) == "string");

    let target = await getArticleById(req.params.id);

    let content = target.content.split("\n").join("<br />");
    content = await replaceResourceUrls(content);

    let ret = `
        <h3>${target.title}</h3>
        <p class="article-date">${target.date}</p>
        <hr />
        <p class="article-content">${content}</p>
    `;
    resp.send(templates["main"]
        .replace("{{PAGE_CONTENT}}", ret)
        .replace("{{PAGE_TITLE}}", target.title)
        .replace("{{RENDER_TIME}}", ((Date.now() - req.startTime) / 1000).toString())
    );
}));

async function run() {
    db = await mongoClient.connect("mongodb://127.0.0.1:27017/NtzxMobileSite");
    templates["main"] = fs.readFileSync(path.join(__dirname, WEB_DIR, "index.html"), "utf-8");

    console.log("Registering service...");
    try {
        await servicehubContext.register("NtzxMobileSite", "http://172.16.9.1:8195", true);
        console.log("Done.");
    } catch(e) {
        console.log("Failed: " + e);
    }

    app.listen(8195);
}

run();
