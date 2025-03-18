
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Hàm lấy địa chỉ IP hiện tại qua API
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
    let url = '';
    let puppeteerOptions = {
        headless: true, // Tắt headless để kiểm tra lỗi
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--incognito",
            "--disable-blink-features=AutomationControlled"
        ]
    };


    let useProxy = false;
    let proxyUsername = '', proxyPassword = '';
    if (body.originUrl) {
        url = body.originUrl;
        delete body.originUrl;
    }
    if (body.proxyUrl) {
        const proxy = 'http://' + body.proxyUrl.toString().split("@")[1];
        const auth = body.proxyUrl.toString().split("@")[0].replace(/^https?:\/\//, '');
        proxyUsername = auth.split(":")[0]
        proxyPassword = auth.split(":")[1]
        puppeteerOptions.args = [...puppeteerOptions.args, `--proxy-server=${proxy}`]
        delete body.proxyUrl;
        useProxy = true;
    }
    const browser = await puppeteer.launch(puppeteerOptions);
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0"
    ];

    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.deleteCookie(...(await page.cookies()));
    if (useProxy) {
        // Xác thực Proxy
        await page.authenticate({
            username: proxyUsername,
            password: proxyPassword
        });
    }

    headers = headers || {};
    await page.setUserAgent(`Mozilla/5.0 (Windows NT ${Math.floor(Math.random() * 10) + 6}.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 5) + 90}.0.0.0 Safari/537.36`);
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (headers['content-length']) {
        delete headers['content-length'];
    }
    // headers.host = 'superbuy.com'
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["Referer"] = 'https://www.superbuy.com/';
    // headers["Connection"] = "keep-alive";
    headers = Object.keys(headers).reduce((acc, key) => {
        if (!key.startsWith('x-')) {
            acc[key] = headers[key];
        }
        return acc;
    }, {});
    headers["Cache-Control"] = "no-cache";
    headers["Pragma"] = "no-cache";
    headers["Upgrade-Insecure-Requests"] = "1";
    let requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
    const originalIP = await getIP(page); //check proxy
    try {
        await page.exposeFunction("makeRequest", async () => {
            try {
                console.log("Headers:", headers);
                const res = await fetch(url, requestOptions);
                if (!res.ok) {
                    return {error: res.status};
                }
                return await res.json();
            } catch (error) {
                console.log('Err', error)
                return {error: error.message};
            }
        });

        const response = await page.evaluate(async () => {
            try {
                return await window.makeRequest();
            } catch (error) {
                return {error: error.message};
            }
        });
        await page.deleteCookie(...(await page.cookies()));
        // await page.close()
        // await browser.close();
        return {
            status: response.status,
            data: response,
            message: 'Thành công',
            success: true,
        };
    } catch (error) {
        await page.close()
        await browser.close();
        return {
            status: 200,
            data: null,
            message: 'Thất bại ' +error,
            success: false,
        };
    }
}


module.exports = {
    commonCallPuppeteer
};