import express from 'express';
import path from 'path';
import flash from 'connect-flash';

import AppManager from '../controllers/AppManager.js';
import InventoryManager from '../controllers/InventoryManager.js';
import UserManager from '../controllers/UserManager.js';

// initializes and handles routes
class ViewRouter
{

    constructor(upload)
    {
        this.router = express.Router();

        this.InitRouting(upload);
        this.InitMiddleware();
    }

    InitRouting()
    {
        const router = this.router;

        // views routes
        router.get('/', this.ViewHome);
        router.get('/login', this.ViewLogin);
        router.get('/register', this.ViewRegister);
        router.get('/catalog', this.ViewCatalog);
        router.get('/cart', this.ViewCart);
        router.get('/order/:id', this.ViewOrder);
        router.get('/profile/:id', this.ViewProfile);
        router.get('/checkout', this.ViewCheckout);
        router.get('/add-book', this.EnterBook);
        router.get('/add-to-cart', this.AddCart);
        
        router.post('/remove-book', this.RemoveBook);
        router.post('/process-checkout', this.Checkout);

        // api
        router.post('/api/register', this.Register);
        router.post('/api/login', this.Login);

        // add new book upon post from client
        router.post('/add-book', AppManager.upload.fields([
            { name: 'coverImage', maxCount: 1 },
            { name: 'isbn', maxCount: 1 }
        ]), this.AddBook);
    }

    InitMiddleware()
    {
        this.router.use((req, res, next) => {
            console.log(`request received at ${req.originalUrl}`);
            next();
        });
    }

    ViewHome = async (req, res) => {

        let books = null, objArr = [];

        try {
            books = await InventoryManager.search_item(null, null); // get all featured books
        } catch (err) {
            throw err;
        }

        if (!Array.isArray(books)) {

            const temp = [books]; // convert single item array
            books = temp;
        }

        // Log the books array
        console.log('Books:'); 
        books.forEach((book, i) => {
            
            
            const imgPath = './uploads/' + book.coverImage; // get cover image
            console.log(imgPath);

            // populate array for ejs
            objArr[i] = { book: book, imgPath: imgPath };
            console.log(objArr[i].book);
        })
        

        res.render('index', {
            title: 'Home',
            content: './pages/home', // Path to the content EJS file
            objArr: objArr, // Ensure books is an array
        });
        
    }

    ViewLogin = async (req, res) => {
        res.render('index', {
            title: 'Login',
            content: './pages/login'
        });
    }

    // middleware for login
    Login = async (req, res, next) => {   
        // parse json string for details
        const email = req.body.email;
        const password = req.body.password.trim();

        try {
            // check if user logged in
            const client = req.session.client; // UserClient userID
            if (client.userID != null) throw 'user already logged in'

            const userID = await UserManager.LoginUser(email, password); // send login request 

            if (typeof userID == 'string') throw userID;
            
            client.userID = userID;
            client.name = user.name;

            // check if cart saved in db
            let order = null, orderItem = null;
            const temp = await InventoryManager.search_order('userID', result);
            const user = await UserManager.ValidateUsers({arg: 'userID', value: userID})[0];

            
            // one inactive order
            if (!Array.isArray(temp) && temp.status == 'inactive') {
                order = temp;
            }
            
            // find inactive order
            for (let i = 0; i < temp.length; i++)
            {
                if (temp[i].status == 'inactive') {
                    order = temp[i];
                    break;
                }
            }

            // order not found, new inactive db order for cart
            if (!order) {
                order = await InventoryManager.new_order(userID, null, 'inactive', 0);
            }
            // get items in cart db order
            else {
                orderItem = await InventoryManager.search_order('orderID', order.orderID);
            }

            // return if no items in stored cart
            if (orderItem.length == 0) {
                console.log('no items in db for user cart.');
                return res.redirect('/');
            }

            // loop through order_item in db
            for (let i = 0; i < orderItem.length; i++) {
                const temp = orderItem[i];
                const item = InventoryManager.search_item('itemID', temp.itemID);

                const itemID = item.itemID;
                const price = item.price;
                const cover = item.coverImage;

                const cart = client.cart.items;
                let cartItem = null;

                // check if stored item in session cart
                for (let i = 0; i < cart.length; i++) {

                    if (cart[i] != itemID) continue; // loop until same item

                    // store cart item if found
                    cartItem = client.cart.items[i];
                    break;
                }

                //if db item found in cart, update quantity and total, check next item
                if (cartItem) {
                    cartItem.quantity += temp.quantity;
                    cartItem.total += price * temp.quantity;
                    temp.quantity = cartItem.quantity;
                    continue;
                }

                //create new item in session cart otherwise
                const quantity = temp.quantity;
                
                const total = quantity * price;

                // create object with item's details needed for cart
                const obj = { 
                    itemID: itemID, 
                    quantity: quantity, 
                    price: total, 
                    coverImage: cover
                };

                client.cart.items.push(obj); //add item object to cart items array
            }
            
            req.flash('messages', 'Login was successful!');
            return res.redirect('/');

            
        } catch (err) {
            req.flash('messages', ('Login was unsuccessful: ' + err));
            return res.redirect('/');
        }
    }

    ViewRegister = (req, res) => {
        // render index.ejs with register embedded
        res.render('index', {
            title: 'Register',
            content: './pages/register'
        });
    }

    // middleware called upon /api/register posted by client
    Register = async (req, res) => {

        const username = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        try {
            // check if client object exists
            const client = req.session.client;

            if (client.userID) throw 'user already logged in';

            const userID = await UserManager.RegisterUser(username, email, password);
            
            
            console.log('Successfully registered user with userID: ' + userID);

            // send userID back to client
            req.flash('messages', 'Registration was successful! You may now log in.');
            return res.redirect('/login');

        } catch (err) {
            req.flash('messages', 'Registration failed: ' + err);
            return res.redirect('/');
        }
        
    }


    ViewCart = async (req, res) => {

        const cart = req.session.client.cart.items;

        if (cart.length == 0) req.flash('Your cart is empty.');

        return res.render('index', {
            title: 'Cart',
            content: './pages/cart',
            cart: cart
        });
    }

    ViewCatalog = async (req, res) => {
        res.render('index', {
            title: 'Book Catalog',
            content: './pages/catalog'
        });
    }

    ViewOrder = async (req, res) => {
         //find user in DB with matching ID
        //if user exists, render profile.ejs and pass user variables to be displayed
        res.render('index', {
            title: 'Order Info',
            content: './pages/order',
            num: req.params.id
        })
    }

    ViewProfile = async (req, res) => {
        res.render('index', {
            title: 'My Profile',
            content: './pages/profile',
            num: req.params.id
        })
    }

    ViewCheckout = async (req, res) => {
        
        const list = req.session.client.cart.items; // Ensure there's items in cart

        try {
            if (list.length === 0) { //return if empty
                req.flash('message', 'Error checking out: cart is empty!');
                return res.redirect('/cart');
            }
            
            // Render the checkout page
            return res.render('index', {
                title: 'Checkout',
                content: './pages/checkout',
                cart: list // Pass the cart to the checkout page
            });
        } catch (err) {
            throw new Error(err);
        }
    }

    Checkout = async (req, res) => {
        const { name, address, city, zip } = req.body; // get order details

        let act, order;
        try { 
            const client = req.session.client;
            const cartID = client.cart.orderID;
        
            const shipping = name + "-" + address + "-" + city + "-" + zip; // combine details with delimiter for splitting

            // place order
            act = 'placing order';
            await InventoryManager.PlaceOrder(cartID, shipping);

            console.log(order);

            act = 'emptying cart';
            // empty cart
            const empty = await InventoryManager.new_order(client.userID, shipping, 'inactive', 0);
            client.cart.orderID = empty.orderID;
            client.cart.items = [];

            req.flash('messages', ('Successfully placed order ' + cartID));

            return res.redirect('/');
        } catch (err) { // error 
            console.error(err);
            req.flash('messages', 'There was an error placing your order.');
            return res.redirect('/')
        }
            
    }

    EnterBook = async (req, res) => {

        res.render('index', {
            title: 'Add Book',
            content: './pages/add-book'
        });
        
    }

    AddBook = async (req, res) => {

        const isbn = req.body.isbn;
        const name = req.body.name;
        const author = req.body.author;
        const price = req.body.price;
        const stock = req.body.stock;
        const coverImage = req.files.coverImage[0].filename;

        console.log(coverImage);
    
        let book;
        try {
            await InventoryManager.new_item(isbn, name, author, price, stock, coverImage);

            req.flash('messages', 'New book added successfully!');
            AppManager.success('adding new book');
            return res.redirect('/');
        } catch (err) {
            AppManager.failure('creating new book', err);
            req.session.flash('messages', 'Error creating new book. Returning to home.');
            return res.redirect('/');
        }
    }

    RemoveBook = async (req, res) => {
    
        // remove book from cart
        const bookId = req.body.bookId; // Get the book ID from the request
        const quantity = req.body.quantity; // get quantity to remove 

        const userID = req.session.client.userID;
        const cart = req.session.client.cart;
        const items = cart.items;
        
        try { // Logic to remove the book from the cart

            let item = null;
            for (let i = 0; i < items.length; i++) // find item in cart
            {
                if (bookId != items[i].itemID) continue;

                item = items[i];
                if (quantity > item.quantity) throw 'not enough items in cart';

                item.quantity -= quantity; // subtract from cart quantity
                if (item.quantity < 1) items.splice(i, 1); // remove if empty 

                break;
            }

            if (!item) throw 'item not found in cart';

            // update db if logged in
            if (userID) { 
                const orderItem = await InventoryManager.search_order_item('itemID', bookId); // get book order by id

                orderItem.quantity += quantity; // decrease quantity
                orderItem.save();
            }
            
            

            req.flash('Successfully removed book from cart!');
        
            res.redirect('/cart'); // Redirect back to the cart page
        } catch (err) {
            req.flash('messages', 'There was an error removing book from cart: ' + err);
            res.redirect('/cart');
        }   
    }

    //middleware for adding items to cart
    AddCart = async (req, res) => {
    
        // get bookID and entered quantity
        const bookId = req.body.bookId;
        const quantity = req.body.quantity;

        const userID = req.session.client.userID;
        
        const cart = req.session.client.cart; //cart holds inactive orderID
        const orderID = cart.orderID;
        
        // Fetch book details from the database and add to cart
        
        try {

            let order = null;
            // long term storage of cart with order
            let act = 'creating new order';
            if (!orderID && userID) {
                order = await InventoryManager.new_order(userID, null, 'inactive', 0); // user logged in and cart empty
                orderID = order.orderID;
            }
            
            act = 'finding item';
            const book = await InventoryManager.search_item('itemID', bookId); //get book by ID
            
            // add item to cart
            act = 'adding new order_item to cart';
            if (book.length == 0) throw 'item could not be found'; 

            // put item details in cart
            let order_item = null;
            act = 'adding to cart';
            cart.items.forEach(item => {
                if (item.itemID == bookId) { // item already exists
                    console.log('item already exists. increasing quantity');

                    const addCost = book.price * quantity; // cost of adding current items
                    item.quantity += quantity; // increase item quantity

                    item.cost += addCost; //increase item total
                    cart.total += addCost;

                    // increase item total in db
                    if (userID) {
                        order_item = InventoryManager.search_order_item('orderID', orderID);
                        order_item.quantity += quantity;
                    }

                    req.flash('messages', 'Increased quantity in cart!');
                    return res.redirect('/');
                }
            });

            // store in database if logged in
            if (userID) await InventoryManager.new_order_item(bookId, orderID, quantity); 

            //create new item and store in cart
            const item = { 
                itemID: book.itemID, 
                quantity: quantity, 
                price:(book.price * quantity), 
                coverImage: book.coverImage 
            }

            cart.items.push(item);

            req.flash('messages', 'Item added to cart!');
            return res.redirect('/');
        
        } catch (err) {
            console.error('ViewRouter: ' + act + ' failed: ' + err);
            req.flash('message', 'Error adding book to cart.');
            return res.redirect('/');
        }
    }
}


export default ViewRouter;