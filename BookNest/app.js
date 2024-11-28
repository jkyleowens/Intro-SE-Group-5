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
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Change to true if using HTTPS
}));
// app.use(session({
//     secret: 'your-secret-key', // Change this to a strong secret
//     resave: false,
//     saveUninitialized: true,
// }));

// Initialize flash messages
app.use(flash());

// Make flash messages accessible in templates
app.use((req, res, next) => {
    res.locals.flashMessage = req.flash('error'); // or 'error', depending on your usage
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

const db = new sqlite3.Database('Backend/Database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Error opening database: ', err.message);
    }
});
//create database for testing



// Create books table if it doesn't exist

db.serialize(() => {
    // db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], (err) => {
    //   if (err) {
    //     console.error('Database error:', err.message);
    //   }
    // });
 
   
        
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
});  
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
            flashMessage: flashMessage,
            user: req.session.user || null // Pass the flash message to the template
        });
    });
});

app.get('/catalog', (req, res) => {
    const flashMessage = req.session.flashMessage; 
    delete req.session.flashMessage; 

    const cart = req.session.cart || [];

    db.all("SELECT * FROM books", [], (err, books) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        // Render the catalog page, passing the books and cart
        res.render('index', {
            title: 'Home',
            content: 'pages/catalog', // Path to the content EJS file
            books: books || [], // Ensure books is an array
            flashMessage: flashMessage,
            user: req.session.user || null, // Pass the flash message to the template
            cart: cart // Pass the cart to the template
        });
    });
});
app.get('/search', (req, res) => {
    const searchQuery = req.query.query;
    
    // Check if a search query was entered
    if (searchQuery) {
        // Use a SQL query to search for books that match the search term
        db.all("SELECT * FROM books WHERE name LIKE ? OR author LIKE ?", [`%${searchQuery}%`, `%${searchQuery}%`], (err, books) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }
            // Render the search results with the books found
            res.render('index', {
                title: 'Search Results',
                content: 'pages/catalog', // Path to the content EJS file
                books: books || [],
                flashMessage: null,
                user: req.session.user || null,
                searchQuery: searchQuery // Optionally pass the search query to display in the search box
            });
        });
    } else {
        // If no search query was provided, render the home page with all books
        db.all("SELECT * FROM books", [], (err, books) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.render('index', {
                title: 'Home',
                content: 'pages/catalog',
                books: books || [],
                flashMessage: null,
                user: req.session.user || null
            });
        });
    }
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
// app.post('/add-to-cart', (req, res) => {
//     const bookId = req.body.bookId;
//     // Fetch book details from the database and add to cart
//     db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).send('Internal Server Error');
//         }
//         if (book) {
//             req.session.cart.push(book); // Add the book to the cart
//             req.session.flashMessage = 'Book added to cart!Add more...';
//         }
//         res.redirect('/catalog');
//     });
// });
// app.post('/add-to-cart', (req, res) => {
//     const bookId = req.body.bookId;

//     // Fetch the book from the database based on the ID
//     db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, book) => {
//         if (err) {
//             console.error('Database error:', err);
//             return res.status(500).send('Internal Server Error');
//         }

//         if (!book) {
//             return res.status(404).send('Book not found');
//         }

//         // Get the current cart from the session or initialize an empty array
//         let cart = req.session.cart || [];

//         // Add the book to the cart if it's not already in the cart
//         cart.push(book);
        
//         // Save the updated cart in the session
//         req.session.cart = cart;

//         // Redirect back to the catalog
//         res.redirect('/catalog');
//     });
// });

app.post('/add-to-cart', (req, res) => {
    const { bookId } = req.body;
    const totalPrice = req.session.totalPrice || 0; // Get total price from session, default to 0 if not set
   

    // Ensure that books are fetched from the database or use a pre-defined list of books.
    db.all("SELECT * FROM books", [], (err, books) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        const book = books.find(b => b.id == bookId); // Find the book by ID

        if (book) {
            const existingBookIndex = req.session.cart.findIndex(b => b.id == bookId);

            if (existingBookIndex !== -1) {
                // Book exists in the cart, increment quantity
                req.session.cart[existingBookIndex].quantity += 1;
            } else {
                // Book doesn't exist, add it to the cart with quantity 1
                req.session.cart.push({ ...book, quantity: 1 });
            }

            console.log('Cart after addition:', req.session.cart);
        }

        
        res.redirect('/cart'); // Redirect to the cart page
    });
});

app.get('/login', (req, res) => { // register page: serve index.ejs with register.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/login'
    })
});

// app.post('/login', async(req, res) => {
    app.post('/login', async (req, res) => {
        const { email, password } = req.body;
    
        if (!email || !password) {
            return res.status(400).send('Missing fields');
        }
    
        const query = "SELECT * FROM users WHERE email = ?";
        db.get(query, [email], async (err, user) => {
            if (err || !user) {
                return res.status(404).send('User not found');
            }
    
            try {
                // Asynchronously compare passwords
                const isPasswordValid = await bcrypt.compare(password, user.password);
    
                if (isPasswordValid) {
                    // Store user info in session or JWT token
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role, // Include role in session
                    };

                    //for testing
                    if (bcrypt.compareSync(password, user.password)) {
                        req.session.user = {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                        };
                    
                        // Return success response instead of redirect
                         return res.status(200).json({ message: 'Login successful' });
                    } else {
                         return res.status(401).send('Invalid credentials');
                     }
                    //for testing
    
                    // if (user.role === 'seller') {
                    //     // Redirect to the add book page for sellers
                    //     return res.redirect('/add-book');
                    // } else {
                    //     // Redirect to catalog page for buyers
                    //     return res.redirect('/catalog');
                    // }
                } else {
                    return res.status(401).send('Invalid credentials');
                }
            } catch (err) {
                return res.status(500).send('Internal server error');
            }
        });
    });
    
//     const { email, password } = req.body;

//     const query = "SELECT * FROM users WHERE email = ?";
//     db.get(query, [email], (err, user) => {
//         if (err || !user) {
//             return res.status(400).send('Invalid email or password');
//         }

//         if (bcrypt.compareSync(password, user.password)) {
//             // Store user info in session or JWT token
//             req.session.user = {
//                 id: user.id,
//                 username: user.username,
//                 email: user.email,
//                 role: user.role, // Include role in session
//             };
            

//            if (user.role === 'seller') {
//                 // Redirect to the add book page for sellers
//                 res.redirect('/add-book');
//             } else {
//                 // Redirect to catalog page for buyers
//                 res.redirect('/catalog');
//             }

//         } else {
//             res.status(400).send('Invalid email or password');
//         }
//         try {
//             const user =  db.findUserByEmail(email);
//             if (!user) {
//               return res.status(404).send('User not found');
//             }
        
//             const isPasswordValid = bcrypt.compare(password, user.password);
//             if (!isPasswordValid) {
//               return res.status(401).send('Invalid credentials');
//             }
        
//             res.status(200).json({ message: 'Login successful' });
//           } catch (err) {
//             res.status(500).send('Internal server error');
//           }
      
//     });
// });


app.get('/register', (req, res) => { // register page: serve index.ejs with register.ejs embedded
    res.render('index', {
        title: 'Login',
        content: 'pages/register'
    })
});
// Route: POST /register - Handle user registration
// app.post('/register', (req, res) => {
//     const { username,email, password } = req.body;

//     // Log incoming request
    

//     // Validate input: Make sure email and password are not empty
//     if (!email || !password) {
//         req.session.flashMessage = 'Email and password are required.';
//         console.log('Validation failed: Empty email or password.');
//         return res.redirect('/register');
//     }

//     // Insert new user into the database
//     const sql = 'INSERT INTO users (username,email, password) VALUES (?, ?, ?)';
//     db.run(sql, [username, email, password], function(err) {
//         if (err) {
//             console.error('Database insertion error:', err.message);

//             // Handle duplicate email error (UNIQUE constraint violation)
//             if (err.message.includes('UNIQUE constraint failed: users.email')) {
//                 req.session.flashMessage = 'Email is already registered. Please log in.';
//                 return res.redirect('/register');
//             }

//             req.session.flashMessage = 'Registration failed. Please try again.';
//             return res.redirect('/register');
//         }

//         console.log(`User registered with ID: ${this.lastID}`);
//         req.session.flashMessage = 'Login Successful';
//         res.redirect('/login');
//     });
// });
// Assuming you're using SQLite
const bcrypt = require('bcrypt');

app.post('/register', (req, res) => {
    const { username, email, password, role } = req.body;

    // Check for missing fields
    if (!username || !email || !password || !role) {
        return res.status(400).send('Missing fields');
    }

    // Check if the email already exists
    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.get(checkEmailQuery, [email], (err, existingUser) => {
        if (err) {
            console.error('Error checking email:', err.message);
            return res.status(500).send('Internal Server Error');
        }

        if (existingUser) {
            // Return 409 if the email already exists
            return res.status(409).send('Email already in use');
        }

        // Hash the password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Insert the new user into the database
        const query = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
        const params = [username, email, hashedPassword, role];

        db.run(query, params, function(err) {
            if (err) {
                console.error('Error inserting user:', err.message);
                return res.status(500).send('Internal Server Error');
            }

            // Return a success response with status 201
            return res.status(201).json({ message: 'User registered successfully', email });
        });
    });
});


// app.post('/register', (req, res) => {
//     const { username, email, password, role } = req.body; // The role comes from the form

//     // Hash the password (you can adjust the salt rounds as needed)
//     const hashedPassword = bcrypt.hashSync(password, 10);
    

//     // Insert the new user with role into the database
//     const query = "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
//     const params = [username, email, hashedPassword, role];

//     db.run(query, params, function(err) {
//         if (err) {
//             console.error('Error inserting user:', err.message);
//             return res.status(500).send('Internal Server Error');
//         }

//         // Redirect to login or show success message
//         res.redirect('/login');
        
//     });
// });

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/'); // Redirect to the home page or login page
    });
});

app.get('/add-book', (req, res) => { // login page: serve index.ejs with login.ejs embedded
    res.render('index', {
        title: 'Add Book',
        content: 'pages/add-book'
    })
});
// app.post('/add-book', upload.single('coverImage'), (req, res) => {
//     const { name, author, price } = req.body;
//     const coverImagePath = req.file ? `/uploads/${req.file.filename}` : null;

//     const sql = `INSERT INTO books (name, author, price, cover_image) VALUES (?, ?, ?, ?)`;

//     db.run(sql, [name, author, price, coverImagePath], (err) => {
//         if (err) {
//             console.error('Error inserting book:', err.message);
//             return res.status(500).send(`Error inserting book: ${err.message}`);
//         }

//         // Set a flash message
//         req.flash('info', 'Book added successfully!');
//         res.redirect('/');
//     });
// });
app.post('/add-book', upload.single('coverImage'), (req, res) => {
    const { name, author, price } = req.body;
    const coverImagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!coverImagePath) {
        return res.status(500).send('Cover image is required');
    }

    const sql = `INSERT INTO books (name, author, price, cover_image) VALUES (?, ?, ?, ?)`;

    db.run(sql, [name, author, price, coverImagePath], (err) => {
        if (err) {
            console.error('Error inserting book:', err.message);
            return res.status(500).send(`Error inserting book: ${err.message}`);
        }

        // Set a flash message
        req.flash('info', 'Book added successfully!');
        // res.redirect('/');
    });
});

// Assuming you have a way to store cart items in session or another structure
app.get('/cart', (req, res) => {
    const cart = req.session.cart || []; // Retrieve the cart from session
    const totalPrice = req.session.totalPrice || 0; // Get total price from session, default to 0 if not set

    res.render('pages/cart', { 
        cart: cart,
        totalPrice: totalPrice});
});
app.post('/remove-book', (req, res) => {
    const bookId = parseInt(req.body.bookId, 10); // Get the book ID to be removed
    const cart = req.session.cart || []; // Retrieve the cart from the session or initialize an empty array

    // Create an updated cart by removing the book with the given ID
    const updatedCart = cart.filter(book => book.id !== bookId);

    // Update the session with the new cart
    req.session.cart = updatedCart;

    // Recalculate the total price
    if (updatedCart.length === 0) {
        req.session.totalPrice = 0; // Explicitly set total price to zero if cart is empty
    } else {
        req.session.totalPrice = updatedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }

    // Recalculate the cart quantity
    req.session.cartQuantity = updatedCart.reduce((total, item) => total + item.quantity, 0);

    // Debug logs for verification
    console.log('Updated Cart:', updatedCart);
    console.log('Total Price:', req.session.totalPrice);

    res.redirect('/cart'); // Redirect back to the cart page
});


// app.post('/remove-book', (req, res) => {
//     const { bookId } = req.body;
//     const cart = req.session.cart;

//     const bookIndex = cart.findIndex(b => b.id == bookId);  // Find the index of the book

//     if (bookIndex !== -1) {
//         const book = cart[bookIndex];

//         if (book.quantity > 1) {
//             // If quantity > 1, decrease the quantity
//             cart[bookIndex].quantity -= 1;
//         } else {
//             // If quantity is 1, remove the book from the cart
//             cart.splice(bookIndex, 1);
//         }
//     }

//     if (cart.length === 0) {
//         req.session.totalPrice = 0; // Explicitly set total price to zero
//     } else {
//         req.session.totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
//     }

//     // Recalculate the cart quantity
//     req.session.cartQuantity = cart.reduce((total, item) => total + item.quantity, 0);

//     console.log('Cart after removal:', req.session.cart);
//     res.redirect('/cart'); // Redirect to the cart page
// });

app.post('/update-quantity', (req, res) => {
    const { bookId, action } = req.body;
    const cart = req.session.cart || [];

    // Find the index of the book in the cart
    const bookIndex = cart.findIndex(book => book.id == bookId);

    if (bookIndex !== -1) {
        const book = cart[bookIndex];

        // Update the quantity based on the action
        if (action === 'increase') {
            book.quantity += 1;
        } else if (action === 'decrease' && book.quantity > 1) {
            book.quantity -= 1;
        }
        
        console.log('Updated cart:', cart);
    }

    // Calculate total price
    let totalPrice = 0;
    cart.forEach(book => {
        totalPrice += book.price * book.quantity; // Multiply price by quantity for each book
    });

    // Store the updated total price in the session
    req.session.totalPrice = totalPrice;

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

// app.get('/order', (req, res) => { // profile page: serve profile template with dynamic content depending on user ID(id)
//     //find user in DB with matching ID
//     //if user exists, render profile.ejs and pass user variables to be displayed
//     res.render('index', {
//         title: 'Book Catalog',
//         content: 'pages/order'
//     })
// });
app.get('/order-confirm/:orderId', async (req, res) => {
    const orderId = req.params.orderId;

    try {
        // Fetch order details
        const order = await db.get(
            `SELECT id, customer_name, address, city, zip, total_price, created_at, status
             FROM orders
             WHERE id = ?`,
            [orderId]
        );

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Fetch order items
        const orderItems = await db.all(
            `SELECT oi.quantity, b.name AS itemName, b.author AS itemAuthor, b.price AS itemPrice, b.cover_image AS itemCover
             FROM order_item oi
             JOIN books b ON oi.itemId = b.id
             WHERE oi.orderId = ?`,
            [orderId]
        );

        order.items = orderItems;

        // Render the order confirmation page
        res.render('pages/order', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/checkout', (req, res) => {
    const totalPrice = req.session.totalPrice || 0; // Get total price from session, default to 0 if not set

    const cart = req.session.cart || []; // Ensure there's a cart array
    if (cart.length === 0) {
        // Redirect to home if the cart is empty
        return res.redirect('/');
    }

    

    // Render the checkout page
    res.render('pages/checkout', {
        cart: cart,
        totalPrice: totalPrice, // Pass total price to the checkout page
    });
});

// app.post('/process-checkout', async (req, res) => {
//     const cart = req.session.cart || [];
//     if (cart.length === 0) {
//         return res.redirect('/order-confirm');
//     }

//     try {
//         // Save order to the database
//         const result = await db.run(
//             `INSERT INTO orders (customer_name, address, city, zip, total_price, created_at, status)
//              VALUES (?, ?, ?, ?, ?, datetime('now'), 'Confirmed')`,
//             [
//                 req.body.customer_name,
//                 req.body.address,
//                 req.body.city,
//                 req.body.zip,
//                 cart.reduce((sum, item) => sum + item.price * item.quantity, 0) // Total price
//             ]
//         );

//         const orderId = result.lastID;

//         // Save items to the database
//         for (const item of cart) {
//             await db.run(
//                 `INSERT INTO order_item (orderId, itemId, quantity)
//                  VALUES (?, ?, ?)`,
//                 [orderId, item.id, item.quantity]
//             );
//         }

//         // Clear the cart
//         req.session.cart = [];

//         // Redirect to order confirmation with the order ID
//         res.redirect(`/order-confirm/${orderId}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Error processing order. Please try again.');
//     }
// });
app.post('/process-checkout', (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        return res.redirect('/cart'); // Redirect to cart if cart is empty
    }

    const { name, address, city, zip, cardNumber, expiration, cvv } = req.body;

    const order = {
        customerName: name,
        address,
        city,
        zip,
        cardNumber,
        expiration,
        cvv,
        items: req.session.cart,  // Retrieve cart from session
        totalPrice: req.session.cart.reduce((total, book) => total + book.price, 0),
        orderDate: new Date().toLocaleString(),
    };

    // Clear the cart after checkout
    req.session.cart = [];

    res.render('order-confirmation', { order });
});

if (process.env.NODE_ENV !== 'test') {
    const port = 3000;
    app.listen(port, () => {
      console.log(`localhost now listening on port ${port}`);
    });
  }
  
  module.exports = app; // Export the app for testing
  

// module.exports = router;
// // end routing


// // set server to listen on port
// app.listen(port, () => {
//     console.log("localhost now listening on port " + port);
// })


