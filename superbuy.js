
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
        headless: "news", // Để headless true dễ bị chặn
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
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
    const page = await browser.newPage();
    if (useProxy) {
        // Xác thực Proxy
        await page.authenticate({
            username: proxyUsername,
            password: proxyPassword
        });
    }

    headers = headers || {};
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (headers['content-length']) {
        delete headers['content-length'];
    }
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["Referer"] = url;
    headers["Connection"] = "keep-alive";
    headers.host = 'superbuy.com'
    headers = Object.keys(headers).reduce((acc, key) => {
        if (!key.startsWith('x-')) {
            acc[key] = headers[key];
        }
        return acc;
    }, {});
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
        await page.close()
        await browser.close();
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
            message: 'Thất bại',
            success: false,
        };
    }
}


module.exports = {
    commonCallPuppeteer
};