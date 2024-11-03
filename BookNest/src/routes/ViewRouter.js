import express from 'express';
import path from 'path';

import AppManager from '../controllers/AppManager.js';
import InventoryManager from '../controllers/InventoryManager.js';

// initializes and handles routes
class ViewRouter
{
    #router;

    constructor()
    {
        this.#router = express.Router();

        this.InitRouting();
    }

    InitRouting()
    {
        const router = this.#router;

        // views routes
        router.get('/', this.ViewHome);
        router.get('/login', this.ViewLogin);
        router.get('/register', this.ViewRegister);
        router.get('/catalog', this.ViewCatalog);
        router.get('/cart', this.ViewCart);
        router.get('/order/:id', this.ViewOrder);
        router.get('/profile/:id', this.ViewProfile);
        router.get('/checkout', this.ViewCheckout);
        router.get('/add-book', this.AddBook);
        router.get('/add-to-cart', this.AddCart);
        
        router.post('/remove-book', this.RemoveBook);

        router.post('/process-checkout', this.Checkout);

        // login middleware
        router.post('/api/login', (req, res, next) => this.PostLogin(req, res, next));

        router.post('api/register', this.PostRegister);

        // add new book upon post from client
        router.post('/add-book', InventoryManager.UploadImage('coverImage'), async (req, res) => { // file, body
            const details = JSON.parse(req.body);
            
            const client = req.session.user;

            // not logged in
            if (client.userID == null) throw 'You must be logged in to add a book.';

            // create book and update inv
            try {

                const book = await InventoryManager.CreateBook(req.body);

                console.log(`Created new book with ISBN: ${book.isbn}`);
                req.flash('message', 'Successfully added new book!');
                return res.redirect('/');

            } catch (err) {
                throw new Error(err);
                return res.redirect('/');
            }


        });

        
    }

    async ViewHome(req, res)
    {
        const InventoryManager = AppManager.getInvMngr();

        // store flash message
        res.locals.messages = req.flash('message');

        let featured = null, objArr = [];

        try {
            
            featured = await InventoryManager.search_item('featured', true); // get all featured books

        } catch (err) {
            AppManager.failure('getting featured books', err);
            flashMessage = 'Could not get featured books for display.';
            req.flash()
        }

        if (!Array.isArray(featured)) {

            const temp = [featured]; // convert single item array
            featured = temp;
        }

        // Log the books array
        console.log('Books:'); 
        featured.forEach((book, i) => {
            
            const imgPath = path.join(AppManager.imgStore, book.coverImage); // get cover image

            // populate array for ejs
            objArr[i] = { book: book, imgPath: imgPath };
            console.log(objArr[i].book);
        })
        

        res.render('index', {
            title: 'Home',
            content: 'pages/home', // Path to the content EJS file
            objArr: objArr, // Ensure books is an array
        });
        
    }

    async ViewLogin(req, res)
    {
        res.render('index', {
            title: 'Login',
            content: 'pages/login'
        });
    }

    // middleware for login
    async PostLogin(req, res, next)
    {   
        // parse json string for details
        const { email, password } = JSON.parse(req.body);

        let clientID, result;                // **** SET client.id in SESSION **** 

        try {
            // check if user logged in
            clientID = req.session.client.userID // UserClient userID
            if (clientID != null) throw 'user already logged in'

            const UserManager = AppManager.getUsrMngr(); // get backend user manager
            if (UserManager == null) throw 'UserManager not initialized';

            result = await UserManager.LoginUser(email, password); // send login request 
            
            if (clientID != result) throw result; // 
            
        } catch (err) {
            req.flash('message', ('Login was unsuccessful: ' + err));
            AppManager.failure(`logging in user with email ${email}`, err);
        }
    }

    async ViewRegister(req, res)
    {
        // render index.ejs with register embedded
        res.render('index', {
            title: 'Login',
            content: 'pages/register'
        });
    }

    async PostRegister(req, res)
    {
        // parse json string for data
        const sent = JSON.parse(req.body)

        //get app manager
        

        const { name, email, password } = sent;

        // Validate input: Make sure email and password are not empty
        let act = 'registering new user'
        
        try { 
            const UserManager = await AppManager.getUsrMngr()
            UserManager.RegisterUser(name, email, password);

        } catch (err) {
            const msg = act + ' failed: ' + err;
            req.flash('error', err)
            return res.redirect('/');
        }

        // Insert new user into the database
        try {
            const user = await newUser(username, email, password);

            console.log(`User registered with ID: ${user.userID}`);
            req.session.flashMessage = 'Registration successful! Please log in.';

            return res.redirect('/login');
        } catch (err) {
            AppManager.failure('creating new user', err);
            req.session.flashMessage = 'Registration failed. Please try again.';
            return res.redirect('/register');
        }
    }

    async ViewCart(req, res)
    {
        const order = req.session.cart; // Retrieve the cart's orderID
        let search = await search_order_item('orderID', order);
        let cart = [];
    
        if (!Array.isArray(search))
        {
            const toArr = [search];
            search = toArr;
        }
    
        for (let i = 0; i < search.length; i++) // loop through list
        {
            const temp = search[i]; // current instance
    
            const item = await searchItem('itemID', temp.itemID);
            const quantity = temp.quantity;
            const pathName = path.join(__dirname, 'public', 'uploads', item.coverImage);
            cart[i] = { item: item, quantity: quantity, imgPath: pathName };;
    
        }
    
        return res.render('pages/cart', { cart: cart});
    }

    async ViewCatalog(req, res)
    {
        res.render('index', {
            title: 'Book Catalog',
            content: 'pages/catalog'
        });
    }

    async ViewOrder(req, res)
    {
         //find user in DB with matching ID
        //if user exists, render profile.ejs and pass user variables to be displayed
        res.render('index', {
            title: 'Order Info',
            content: 'pages/order',
            num: req.params.id
        })
    }

    async ViewProfile(req, res)
    {
        res.render('index', {
            title: 'My Profile',
            content: 'pages/profile',
            num: req.params.id
        })
    }

    async ViewCheckout(req, res)
    {
        const cart = req.session.cart; // Ensure there's a cart ID
    
        try {
            const list = await search_order_item('orderID', cart);
            if (Array.isArray(list) && list.length === 0) { //return if empty
                req.session.flashMessage = 'Error checking out: cart is empty!';
                return res.redirect('/');
            }
            if (!Array.isArray) { 
                const temp = list;
                list = [temp];
            }
            // Render the checkout page
            res.render('checkout', {
                title: 'Checkout',
                cart: list // Pass the cart to the checkout page
            });
        } catch (err) {
            failure('checking out', err);
        }
    }

    async Checkout()
    {
        const { name, address, city, zip } = req.body; // get order details

        let act, order;
        try { 
            const user = req.session.user;
            const cart = req.session.cart;
            
            act = 'getting items in cart';
            const list = await search_order_item('orderID', cart); // list of order_item in cart
            let totalPrice = 0.00;

            if (!Array.isArray(list)) totalPrice = list.price;

            list.forEach(async element => { // loop through order_item list
                const item = await searchItem('itemID', element.itemID);
                totalPrice += item.price * element.quantity; // add quantity multiplied by price
            });
            act = 'searching for cart order';
            order = await searchOrder('orderID', cart);
            const shipping = name + "-" + address + "-" + city + "-" + zip; // combine details with delimiter for splitting

            act = 'placing order';
            // place order
            order.shipping = shipping; 
            order.total = totalPrice;
            order.status = 'pending';
            await order.save();

            console.log(order);

            act = 'emptying cart';
            // empty cart
            const empty = new_order(null, null);
            cart = empty.orderID;

            if (!user.id) { console.log('No user logged in.'); }
            else empty.userID = user.id;
            return res.redirect('/');
        } catch (err) { // error 
            failure(act, err);
            return res.redirect('/')
        }
    }

    async AddBook(type, req, res)
    {
        if (type == 'GET') {
            res.render('index', {
                title: 'Add Book',
                content: 'pages/add-book'
            });
        }
        if (type == 'POST') {
            const { isbn, name, author, price } = req.body;
            const coverImageName = req.file ? req.file.filename : null;
        
            let book;
            try {
                await newItem(isbn, name, author, price, coverImageName);
                req.flash('info', 'New book added successfully!');
                AppManager.success('adding new book');
                res.redirect('/');
            } catch (err) {
                AppManager.failure('creating new book', err);
                req.session.flashMessage = 'Error creating new book. Returning to home.';
                return res.redirect('/');
            }
        }
    }

    async RemoveBook(req, res)
    {
        // remove book from cart
        const bookId = req.body.bookId; // Get the book ID from the request
        const quantity = req.body.quantity; // get quantity                     *** NEEDS TO ASK QUANTITY
    
        try { // Logic to remove the book from the cart
            let book = await search_order_item('itemID', bookId); // get book by id
            if (!Array.isArray(book)) // if 1 match
            {
                if (quantity >= book.quantity) await free_instance('order_item', book);
                else { 
                    book.quantity -= quantity; 
                    await book.save(); 
                }
    
                req.session.flashMessage = 'Successfully removed book from cart!'
            }
            
            res.redirect('/cart'); // Redirect back to the cart page
        } catch (err) {
            req.session.flashMessage = 'There was an error removing book from cart.';
            failure('removing book from cart', err);
            res.redirect('/cart');
        }   
    }

    async AddCart(req, res)
    {
        // get bookID and entered quantity
        const bookId = req.body.bookId;
        const quantity = req.body.quantity;
        
        const cart = req.session.user.cart; //cart holds inactive orderID
        
        // Fetch book details from the database and add to cart
        let act = 'finding book by bookID';
        try {
            const book = await InventoryManager.search_item('itemID', bookId); //get book by ID
    
            act = 'adding new order_item to cart';
            if (!Array.isArray(book)) // create order_item if item returned
            {
                const cartItem = await InventoryManager.new_order_item(cart.orderID, bookId, quantity); // store quantity of item in cart

                cart.items.push(cartItem);
                req.flash('message', 'Item added to cart!');
            }
            else req.flash('message', 'Book could not be found.');
    
            return res.redirect('/');
        
        } catch (err) {
            console.error('ViewRouter: ' + act + ' failed: ' + err);
            req.flash('message', 'Error adding book to cart.');
            return res.redirect('/');
        }
    }
}


export default ViewRouter;