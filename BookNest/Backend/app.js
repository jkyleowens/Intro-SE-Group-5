const express = require('express');
const ejs = require

const app = express();
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "../views"));

app.get("/", (req, res) => {
    res.render('index.ejs');
})

app.listen(3000, () => {
    console.log("Server successfully started at localhost:3000");
})