// import puppeteer from 'puppeteer-extra';
const puppeteer = require("puppeteer-extra");
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
 async function commonCall(headers, body) {
    let url = '';
    if (body.originUrl) {
        url = body.originUrl;
        delete body.originUrl;
    }
    if (body.proxyUrl) {
        delete body.proxyUrl;
    }

    // Đảm bảo headers đúng format
    headers = headers || {};
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    let requestOptions = {
        method: 'POST',
        headers: headers, // headers phải là object
        body: JSON.stringify(body),
        mode: 'cors' // Nếu gọi từ trình duyệt
    };
    requestOptions = {
        method: 'POST',
        headers: {
            cookie: '__cf_bm=XTDuRPrvQ.Au9PiYbUSVlMQFn2dD4.bgT6SZs3xn9_Q-1738563638-1.0.1.1-GUhszPjHKqowouB5VhjAyc6EiLC62tZ8MJzgQPrzBOpxwTPZe6p8X3O76N_faXjrAc9F.4u73WAZU9PIHTxT2w;www.echatsoft.com_84_encryptVID=xkAT4p0vWJBXbf0JFQ53RA%3D%3D; www.echatsoft.com_84_chatVisitorId=4069280006; lang=zh-cn; loginInWebsite=cn; currency=CNY; _rdt_uuid=1721121912061.b92b0148-ae36-4f32-82d1-de982c40060d;',
            accept: '*/*',
            origin: 'https://www.superbuy.com',
            connection: 'keep-alive',
            host: 'front.superbuy.com',
            'postman-token': 'efa5f49b-3404-4286-b9ff-614dbef534b2',
            'user-agent': 'PostmanRuntime/7.39.0',
            'content-type': 'application/json; charset=UTF-8',
            'content-length': '256',
            'accept-encoding': 'gzip,deflate',
            'Content-Type': 'application/json'
        },
        body: '{"goodUrl":"https%3A%2F%2Fm.1688.com%2Foffer%2F659305651746.html","sign":"44cefdf19700250c230beb2ca8a0cfcc"}'
    }
    console.log("Final requestOptions:", requestOptions);

    try {
        const response = await fetch(url, requestOptions);
        const text = await response.json();
        console.log("Response:", text);

        return {
            status: response.status,
            data: text,
            message: 'Thành công',
            success: true,
        };
    } catch (error) {
        console.error("Fetch error:", error);

        return {
            status: 500,
            data: null,
            message: 'Thất bại',
            success: false,
        };
    }
}

// Hàm lấy địa chỉ IP hiện tại qua API
async function getIP(page) {
    try {
        await page.goto("https://api.myip.com/");
        const ipData = await page.evaluate(() => document.body.innerText);
        console.log(ipData)
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
        headless: true, // Chạy ẩn (headless mode)
        args: ["--no-sandbox", '--disable-setuid-sandbox']
    }
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
    await page.setRequestInterception(true);
    await page.setBypassCSP(true); // Bỏ qua kiểm tra Content Security Policy
    headers = headers || {};
    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (headers['content-length']) {
        delete headers['content-length'];
    }
    let requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    };
    // const originalIP = await getIP(page); check proxy
    try {
        await page.exposeFunction("makeRequest", async () => {
            try {
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

        return {
            status: response.status,
            data: response,
            message: 'Thành công',
            success: true,
        };
    } catch (error) {
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