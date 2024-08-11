const express = require("express");
const path = require("path");

const app = express();

app.get("/", (req, res) => {
    //res.send("hello server!");
    res.sendFile(path.join(__dirname + "/index.html"));
})

app.listen(3000, () => {
    console.log("server running ok, port", 3000);
})