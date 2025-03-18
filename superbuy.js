const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Hàm lấy IP để kiểm tra proxy
async function getIP(page) {
    try {
        await page.goto("https://checkip.amazonaws.com/", { waitUntil: 'networkidle2' });
        const ipData = await page.evaluate(() => document.body.textContent.trim());
        console.log('Your IP:', ipData);
        return ipData;
    } catch (error) {
        console.error("Lỗi lấy IP:", error);
        return null;
    }
}

async function commonCallPuppeteer(headers, body) {
    puppeteer.use(StealthPlugin());
    let url = 'https://www.superbuy.com/en/'; // Đặt URL trang Superbuy
    let puppeteerOptions = {
        headless: true, // Chạy có giao diện để debug
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    };

    let useProxy = false;
    let proxyUsername = '', proxyPassword = '';

    if (body.proxyUrl) {
        const proxy = 'http://' + body.proxyUrl.toString().split("@")[1];
        const auth = body.proxyUrl.toString().split("@")[0].replace(/^https?:\/\//, '');
        proxyUsername = auth.split(":")[0];
        proxyPassword = auth.split(":")[1];
        puppeteerOptions.args.push(`--proxy-server=${proxy}`);
        useProxy = true;
    }

    const browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();

    if (useProxy) {
        await page.authenticate({ username: proxyUsername, password: proxyPassword });
    }


    //await page.goto(url); // Mở trang Superbuy trước
    page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});

    headers = headers || {};
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (headers['content-length']) delete headers['content-length'];
    headers.host = 'superbuy.com';
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["Referer"] = url;

    // Xóa các header `x-*`
    headers = Object.keys(headers).reduce((acc, key) => {
        if (!key.startsWith('x-')) acc[key] = headers[key];
        return acc;
    }, {});

    let requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };

    const originalIP = await getIP(page); // Kiểm tra IP proxy

    try {
        const response = await page.evaluate(async (fetchUrl, fetchOptions) => {
            try {
                const res = await fetch(fetchUrl, fetchOptions);
                if (!res.ok) return { error: res.status };
                return await res.json();
            } catch (error) {
                return { error: error.message };
            }
        }, body.originUrl, requestOptions);

        await page.close();
        await browser.close();

        return {
            status: response.status || 200,
            data: response,
            message: 'Thành công',
            success: true,
        };
    } catch (error) {
        await page.close();
        await browser.close();

        return {
            status: 500,
            data: null,
            message: 'Thất bại',
            success: false,
            error: error.message,
        };
    }
}

module.exports = { commonCallPuppeteer };
