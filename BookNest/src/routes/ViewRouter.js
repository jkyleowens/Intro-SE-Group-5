import express from 'express';
import path from 'path';
import flash from 'connect-flash';

import AppManager from '../controllers/AppManager.js';
import InventoryManager from '../controllers/InventoryManager.js';
import UserManager from '../controllers/UserManager.js';

// initializes and handles routes

const ViewRouter = express.Router();

// views routes
ViewRouter.get('/', ViewHome);
ViewRouter.get('/home', ViewHome);
ViewRouter.get('/login', ViewLogin);
ViewRouter.get('/register', ViewRegister);
ViewRouter.get('/catalog', ViewCatalog);
ViewRouter.get('/cart', ViewCart);
ViewRouter.get('/featured', ViewFeatured);

ViewRouter.get('/order/:id', ViewOrder);
ViewRouter.get('/profile/:id', ViewProfile);

ViewRouter.get('/add-book', EnterBook);
ViewRouter.get('/checkout', ViewCheckout);


async function ViewHome (req, res) {
    res.render('index', {
        title: 'BookNest - Home',
        content: './pages/home'
    });
}

async function ViewCatalog (req, res) {
    let books = null, objArr = [];
    try {
        books = await InventoryManager.search_item(null, null); // get all featured books
        if (!Array.isArray(books)) {

            const temp = [books]; // convert single item array
            books = temp;
        }

        // loop through all items
        books.forEach((book, i) => {
            // store item details
            const obj = { 
                isbn: book.itemID,
                name: book.name, 
                author: book.author,
                price: book.price,
                coverImage: './uploads/' + book.coverImage
            };
        
            // populate array for ejs
            objArr[i] = obj;
        });
    } catch (err) {
        throw err;
    }
    res.render('index', {
        title: 'Catalog',
        content: './pages/catalog', // Path to the content EJS file
        objArr: objArr, // Ensure books is an array
    });

}

async function ViewFeatured (req, res) {
    res.render('index', {
        title: 'Featured Books',
        content: './pages/featured'
    });
}

async function ViewLogin (req, res) {
    res.render('index', {
        title: 'Login',
        content: './pages/login'
    });
}

async function ViewRegister (req, res) {
    // render index.ejs with register embedded
    res.render('index', {
        title: 'Register',
        content: './pages/register'
    });
}

async function ViewCart (req, res) {

    const cart = req.session.client.cart;
    let items = [];

    for (const [itemID, quantity] of cart.items) {
        const book = await InventoryManager.search_item('itemID', itemID);
        if (book) items.push({
            itemID: book.itemID,
            name: book.name,
            author: book.author,
            quantity: quantity,
            price: book.price,
            coverImage: book.coverImage
        });
    }

    res.render('index', {
        title: 'Cart',
        content: './pages/cart',
        cart: items
    });
}

async function ViewOrder (req, res) {
    //find user in DB with matching ID
    //if user exists, render profile.ejs and pass user variables to be displayed
    res.render('index', {
        title: 'Order Info',
        content: './pages/order',
        num: req.params.id
    }); 
}

async function ViewProfile (req, res) {
    res.render('index', {
        title: 'My Profile',
        content: './pages/profile',
        num: req.params.id
    });
}

async function ViewCheckout (req, res) {

    const list = req.session.client.cart.items; // Ensure there's items in cart

    try {
        if (list.length === 0) { //return if empty
            req.flash('message', 'Error checking out: cart is empty!');
            res.redirect('/cart');
        }
        
        // Render the checkout page
        res.render('index', {
            title: 'Checkout',
            content: './pages/checkout',
            cart: list // Pass the cart to the checkout page
        });
    } catch (err) {
        throw new Error(err);
    }
}

async function EnterBook (req, res) {

    res.render('index', {
        title: 'Add Book',
        content: './pages/add-book'
    });

}

export default ViewRouter;