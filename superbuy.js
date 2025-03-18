const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

async function commonCallPuppeteer(headers, body) {
    puppeteer.use(StealthPlugin());

    let url = "https://www.superbuy.com/en/";
    let puppeteerOptions = {
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-blink-features=AutomationControlled"
        ]
    };

    let useProxy = false;
    let proxyUsername = "", proxyPassword = "";

    if (body.proxyUrl) {
        const proxy = "http://" + body.proxyUrl.toString().split("@")[1];
        const auth = body.proxyUrl.toString().split("@")[0].replace(/^https?:\/\//, "");
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

    // Giảm nhận diện bot
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        Object.defineProperty(navigator, "platform", { get: () => "Win32" });
    });

    headers = headers || {};
    if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    if (headers["content-length"]) delete headers["content-length"];
    headers.host = "superbuy.com";
    headers["Accept-Language"] = "en-US,en;q=0.9";
    headers["Referer"] = url;
    headers["Origin"] = url;

    // Xóa các header `x-*`
    headers = Object.keys(headers).reduce((acc, key) => {
        if (!key.startsWith("x-")) acc[key] = headers[key];
        return acc;
    }, {});

    let requestOptions = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body)
    };

    try {
        // ✅ Gọi API ngay sau khi mở trang
        await page.goto(url, { waitUntil: "domcontentloaded" }); // Chỉ chờ DOM load, không chờ hết tài nguyên

        // ✅ Chạy fetch() bên ngoài `page.evaluate()` để tránh mất context
        const responsePromise = page.waitForResponse(response => response.url() === body.originUrl);

        await page.evaluate((fetchUrl, fetchOptions) => {
            fetch(fetchUrl, fetchOptions).catch(err => console.log("🔹 Fetch Error:", err));
        }, body.originUrl, requestOptions);

        const response = await responsePromise;
        const responseData = await response.json();

        console.log("🔹 Response:", responseData);
        await page.close();
        await browser.close();

        return {
            status: response.status() || 200,
            data: responseData,
            message: "Thành công",
            success: true,
        };
    } catch (error) {
        console.error("🔹 Lỗi request:", error);
        await page.close();
        await browser.close();

        return {
            status: 500,
            data: null,
            message: "Thất bại",
            success: false,
            error: error.message,
        };
    }
}

module.exports = { commonCallPuppeteer };
