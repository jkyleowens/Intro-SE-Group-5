//includes 
const express = require('express')

//init app & set port
const app = express();
const session = require('express-session');
const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const multer = require('multer');

const flash = require('connect-flash');


// Configure session middleware
app.use(session({
    secret: 'your-secret-key', // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
}));

// Initialize flash messages
app.use(flash());

// Make flash messages accessible in templates
app.use((req, res, next) => {
    res.locals.flashMessage = req.flash('info'); // or 'error', depending on your usage
    next();
});
const port = 3000;

app.set('view engine', 'ejs');

//load frontend css & js
app.use(express.static(__dirname + "/public"));

const path = require('path');

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files

// Middleware to serve static files
app.use('/uploads', express.static(path.join(__dirname, 'publics', 'uploads')));

// Initialize the cart

// Initialize the cart on first visit
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
    next();
});

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('Backend/Database.db');

// Create books table if it doesn't exist

db.serialize(() => {
    // db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
    //   if (err) {
    //     console.error('Database error:', err.message);
    //   }
    // });
 
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT,
  password TEXT
);
      `);
      });    
db.run(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    price REAL,
    coverImage TEXT
  )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    zip TEXT NOT NULL,
    total_price REAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Pending'
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    book_name TEXT NOT NULL,
    author TEXT NOT NULL,
    price REAL NOT NULL,
    coverImage TEXT,
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

  `);

module.exports = db;


// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: 'public/uploads/', // Save images here
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  },
});
const upload = multer({ storage });

//routing


app.get('/', (req, res) => {
    const flashMessage = req.session.flashMessage; 
    delete req.session.flashMessage; 

    db.all("SELECT * FROM books", [], (err, books) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        console.log('Books:', books); // Log the books array

        res.render('index', {
            title: 'Home',
            content: 'pages/home', // Path to the content EJS file
            books: books || [], // Ensure books is an array
            flashMessage: flashMessage // Pass the flash message to the template
        });
    });
});
// app.post('/add-to-cart', (req, res) => {
//     const bookId = parseInt(req.body.bookId); // Get the book ID from the request

//     // Fetch book details from the database
//     db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, row) => {
//         if (err) {
//             console.error('Error fetching book:', err.message);
//             return res.status(500).send('Internal Server Error');
//         }

//         if (!row) {
//             return res.status(404).send('Book not found');
//         }

//         // Add the book to the cart
//         req.session.cart.push(row);

//         // Set a flash message
//         req.flash('info', 'Book added to cart successfully!');
//         res.redirect('/'); // Redirect back to the home page
//     });
// });
app.post('/add-to-cart', (req, res) => {
    const bookId = req.body.bookId;
    // Fetch book details from the database and add to cart
    db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }
        if (book) {
            req.session.cart.push(book); // Add the book to the cart
            req.session.flashMessage = 'Book added to cart!';
        }
        res.redirect('/');
    });
});


app.get('/login', (req, res) => { // login page: serve index.ejs with login.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/login'
    })
});
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        req.session.flashMessage = 'Email and password are required!';
        return res.redirect('/login');
    }

    // Example query to check user
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], (err, row) => { // Use email instead of username
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        if (!row || row.password !== password) { // Compare with password directly
            // req.session.flashMessage = 'Invalid email or password';
            return res.redirect('/login');
        }

        req.session.user = { id: row.id, email: row.email };
        res.redirect('/');
    });
});


app.get('/register', (req, res) => { // register page: serve index.ejs with register.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/register'
    })
});
// Route: POST /register - Handle user registration
app.post('/register', (req, res) => {
    const { username,email, password } = req.body;

    // Log incoming request
    

    // Validate input: Make sure email and password are not empty
    if (!email || !password) {
        req.session.flashMessage = 'Email and password are required.';
        console.log('Validation failed: Empty email or password.');
        return res.redirect('/register');
    }

    // Insert new user into the database
    const sql = 'INSERT INTO users (username,email, password) VALUES (?, ?, ?)';
    db.run(sql, [username, email, password], function(err) {
        if (err) {
            console.error('Database insertion error:', err.message);

            // Handle duplicate email error (UNIQUE constraint violation)
            if (err.message.includes('UNIQUE constraint failed: users.email')) {
                req.session.flashMessage = 'Email is already registered. Please log in.';
                return res.redirect('/register');
            }

            req.session.flashMessage = 'Registration failed. Please try again.';
            return res.redirect('/register');
        }

        console.log(`User registered with ID: ${this.lastID}`);
        req.session.flashMessage = 'Registration successful! Please log in.';
        res.redirect('/login');
    });
});
app.get('/add-book', (req, res) => { // login page: serve index.ejs with login.ejs embedded
    res.render('index', {
        title: 'Add Book',
        content: 'pages/add-book'
    })
});
app.post('/add-book', upload.single('coverImage'), (req, res) => {
    const { name, author, price } = req.body;
    const coverImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `INSERT INTO books (name, author, price, cover_image) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name, author, price, coverImagePath], (err) => {
        if (err) {
            console.error('Error inserting book:', err.message);
            return res.status(500).send(`Error inserting book: ${err.message}`);
        }

        // Set a flash message
        req.flash('info', 'Book added successfully!');
        res.redirect('/');
    });
});
// Assuming you have a way to store cart items in session or another structure
app.get('/cart', (req, res) => {
    const cart = req.session.cart || []; // Retrieve the cart from session
    res.render('pages/cart', { cart });
});



// Route to remove a book from the cart
app.post('/remove-book', (req, res) => {
    const bookId = req.body.bookId; // Get the book ID from the request
    // Logic to remove the book from the cart
    req.session.cart = req.session.cart.filter(book => book.id !== bookId);
    res.redirect('/cart'); // Redirect back to the cart page
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

app.get('/checkout', (req, res) => {
    const cart = req.session.cart || []; // Ensure there's a cart array
    if (cart.length === 0) {
        // Redirect to home if the cart is empty
        return res.redirect('/');
    }

    // Render the checkout page
    res.render('checkout', {
        title: 'Checkout',
        cart: cart // Pass the cart to the checkout page
    });
});

app.post('/process-checkout', (req, res) => {
    const { name, address, city, zip } = req.body;
    const totalPrice = req.session.cart.reduce((sum, book) => sum + book.price, 0);
    
    const orderSql = `INSERT INTO orders (customer_name, address, city, zip, total_price) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(orderSql, [name, address, city, zip, totalPrice], function(err) {
        if (err) {
            console.error('Error inserting order:', err.message);
            return res.status(500).send('Internal Server Error');
        }

        const orderId = this.lastID; // Get the ID of the newly created order
        
        const itemSql = `INSERT INTO order_items (order_id, book_id, book_name, author, price, cover_image) VALUES (?, ?, ?, ?, ?, ?)`;
        const insertPromises = req.session.cart.map(book => {
            return new Promise((resolve, reject) => {
                db.run(itemSql, [orderId, book.id, book.name, book.author, book.price, book.coverImage], (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        });

        Promise.all(insertPromises)
            .then(() => {
                req.session.cart = []; // Clear the cart after processing the order
                req.session.flashMessage = 'Thank you for your purchase!';
                res.redirect('/');
            })
            .catch(err => {
                console.error('Error inserting order items:', err.message);
                return res.status(500).send('Internal Server Error');
            });
    });
});

module.exports = router;
// end routing


// set server to listen on port
app.listen(port, () => {
    console.log("localhost now listening on port " + port);
})


