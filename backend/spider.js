const rp = require("request-promise");
const html_to_text = require("html-to-text");

async function getArticleData(url) {
    let rawData = await rp.get("http://www.ntzx.cn" + url);

    let title = rawData.split(`<td class="title">`, 2)[1].split(`</td`, 2)[0];
    let date = rawData.split("添加日期：", 2)[1].trim().split(" ", 2)[0].split("\n", 2)[0].trim()
    let content = html_to_text.fromString(rawData, {
        "wordwrap": false
    }).split("繁體中文", 2)[1].split("[打印 [javascript:window.print();]]", 2)[0].trim();

    return {
        "title": title,
        "content": content,
        "date": date
    };
}

async function collectArticles() {
    let rawData = await rp.get("http://www.ntzx.cn/Category_10/Index.aspx", {
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/55.0.2883.87 Chrome/55.0.2883.87 Safari/537.36"
        }
    });

    let data = rawData
        .split("<!-- 子栏目列表信息列表开始 -->", 2)[1]
        .split("<!-- 子栏目列表信息列表结束 -->", 2)[0]
        .trim()
        .split("<table width=\"100%\"", 2)[1]
        .split("</table>", 2)[0]
        .split("<tr>")
        .map(v => v.split("</tr>", 2)[0])
        .map(v => v.split("<td>").map(v => v.split("</td>")[0]));

    data.shift();
    data = data
        .map(v => {
            if (v.length < 4) return {};

            let url = v[2].split("<a href=\"")[1].split("\"")[0];
            let title = v[2].split("</a>")[0].split("</font>")[0].split(">");
            title = title[title.length - 1];

            return {
                "url": url,
                "title": title,
                "date": v[3]
            }
        });

    return data;
}

module.exports = {
    collectArticles: collectArticles,
    getArticleData: getArticleData
};
