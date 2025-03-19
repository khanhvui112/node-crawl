const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

function randomUserAgent() {
    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    const osList = [
        "Windows NT 10.0; Win64; x64",
        "Windows NT 10.0; WOW64",
        "Windows NT 6.1; Win64; x64",
        "Macintosh; Intel Mac OS X 10_15_7",
        "X11; Linux x86_64",
        "X11; Ubuntu; Linux x86_64"
    ];

    const browserEngines = [
        "AppleWebKit/537.36 (KHTML, like Gecko)",
        "AppleWebKit/605.1.15 (KHTML, like Gecko)",
        "Gecko/20100101 Firefox/120.0",
        "Gecko/20100101 Firefox/119.0"
    ];

    function getRandomVersion(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const os = getRandomElement(osList);
    const engine = getRandomElement(browserEngines);
    const chromeVersion = getRandomVersion(100, 120);
    const safariVersion = getRandomVersion(500, 600);
    return `Mozilla/5.0 (${os}) ${engine} Chrome/${chromeVersion}.0.0.0 Safari/${safariVersion}.1`;
}

async function setCookiesFromHeader(page, cookieHeader) {
    if (!cookieHeader) return;
    let cookies = cookieHeader.split(";");
    // const regex = /[^a-zA-Z0-9]$/;
    for (let c of cookies) {

        // let name = c[0]
        // if (name && name.endsWith(""))

        if (c && c !== '') {
            c = c.split("=")
            await page.setCookie(
                {name: c[0].trim(), value: c[1].trim(), domain: ".superbuy.com", path: "/"}
            )
        }

    }
}

async function commonCallPuppeteer(headers, body) {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-blink-features=AutomationControlled"
        ]
    });

    const page = (await browser.pages())[0]; // Lấy tab đầu tiên
    await page.setUserAgent(randomUserAgent());

    //Chặn tài nguyên không cần thiết
    await page.setRequestInterception(true);
    page.on("request", (req) => {
        if (["image", "stylesheet", "font", "media", "script"].includes(req.resourceType())) {
            req.abort(); //Không tải tài nguyên nặng
        } else {
            req.continue();
        }
    });
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    });
    await page.goto("https://www.superbuy.com/cn/", {waitUntil: "domcontentloaded"});

    //Set cookie để giữ session
    await setCookiesFromHeader(page, headers.cookie);
    // await page.setCookie(
    //     { name: "currency", value: "CNY", domain: ".superbuy.com", path: "/" },
    //     { name: "lang", value: "zh-cn", domain: ".superbuy.com", path: "/" }
    // );
    let requestOptions = {
        method: "POST",
        headers: {...headers, "sec-fetch-site": "same-site"},
        body: JSON.stringify(body)
    };

    try {
        // Gửi request trực tiếp từ Puppeteer bằng page.evaluateHandle()
        const responseHandle = await page.evaluateHandle(async (fetchUrl, fetchOptions) => {
            fetchOptions.credentials = "include"; //Giữ cookie
            const res = await fetch(fetchUrl, fetchOptions);
            return res.json();
        }, body.originUrl, requestOptions);

        const response = await responseHandle.jsonValue(); //Lấy dữ liệu từ handle
        await responseHandle.dispose(); //Giải phóng tài nguyên
        await browser.close();
        return {status: 200, data: response, message: "Thành công", success: true};
    } catch (error) {
        await browser.close();
        return {status: 500, data: null, message: "Thất bại", success: false, error: error.message};
    }
}

module.exports = {commonCallPuppeteer};
