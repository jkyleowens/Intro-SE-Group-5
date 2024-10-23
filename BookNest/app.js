//includes 
const express = require('express')

//init app & set port
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

//load frontend css & js
app.use(express.static(__dirname + "/public"));

//routing
app.get('/', (req, res) => { // home page: serve index.ejs with home.ejs embedded
    res.render('index', {
        title: 'Home Page',
        content: 'pages/home'
    })
});

app.get('/login', (req, res) => { // login page: serve index.ejs with login.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/login'
    })
});

app.get('/register', (req, res) => { // register page: serve index.ejs with register.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/register'
    })
});

app.get('/catalog', (req, res) => { // catalog page: serve index.ejs with register.ejs embedded
    res.render('index', {
        title: 'Book Catalog',
        content: 'pages/catalog'
    })
});

app.get('/profile/:id', (req, res) => { // profile page: serve profile template with dynamic content depending on user ID(id)
    //find user in DB with matching ID
    //if user exists, render profile.ejs and pass user variables to be displayed
    res.render('index', {
        title: 'My Profile',
        content: 'pages/profile',
        num: req.params.id
    })
});

app.get('/order/:id', (req, res) => { // profile page: serve profile template with dynamic content depending on user ID(id)
    //find user in DB with matching ID
    //if user exists, render profile.ejs and pass user variables to be displayed
    res.render('index', {
        title: 'Order Info',
        content: 'pages/order',
        num: req.params.id
    })
});
// end routing


// set server to listen on port
app.listen(port, () => {
    console.log("localhost now listening on port " + port);
})


