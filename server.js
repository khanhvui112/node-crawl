const express = require("express");
const superBuy = require("./superbuy.js");
const app = express();
const port = 3000;
const cors = require("cors");
app.use(cors());
app.use(express.json());
const apiRouter = express.Router();
apiRouter.post("/superbuy", async (req, res) => {
    const body = req.body;
    if (!body.originUrl) {
        return res.status(200).json({
            success: false,
            message: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại"
        });
    }
    try {
        let result = await superBuy.commonCallPuppeteer(req.headers, body);
        res.json(result.data);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

app.use("/api", apiRouter);
app.listen(port, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
app.use((req, res, next) => {
    // console.log("Incoming request:");
    // console.log("Method:", req.method);
    // console.log("URL:", req.originalUrl);
    // console.log("Headers:", req.headers);
    // console.log("Body:", req.body);
    next();
});
