import express from 'express';
import path from 'path';
import flash from 'connect-flash';
import multer from 'multer';
import aws from 'aws-sdk';
import multerS3 from 'multer-s3';

import InventoryManager from '../controllers/InventoryManager.js';
import UserManager from '../controllers/UserManager.js';

// router for essential frontend <---> backend operations
// catalog/cart, inventory and order management, account management

const APIRouter = express.Router();

aws.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

  // Create an S3 instance
const s3 = new aws.S3();

// setup multer

const upload = multer({ 
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        acl: 'public/read',
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname })
        },
        key: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const unique = `${Date.now()}-${req.body.isbn}`;
            const fileName = unique + ext;
            cb(null, fileName);
        }
    }) 
}); 

// api
APIRouter.post('/register', Register);
APIRouter.post('/login', Login);
APIRouter.post('/add-cart/:isbn', AddCart);
APIRouter.post('/remove-cart/:isbn', RemoveBook);
APIRouter.post('/process-checkout', Checkout);
// add new book upon post from client
APIRouter.post('/add-book', upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'isbn', maxCount: 1 }
]), AddBook);


// middleware for login
async function Login (req, res) {   
    // parse json string for details
    const email = req.body.email;
    const password = req.body.password;

    const response = { success: true, message: null };

    try {
        // check if user logged in
        const client = req.session.client; // UserClient userID
        if (client.userID != null) throw 'you are already logged in';

        const user = await UserManager.LoginUser(email, password); // send login request             

        response.message = `You successfully logged in to user account ${user.userID}! No items found in previous session.`;
        
        req.session.client.userID = user.userID;

        await UserManager.UpdateUserCart(req.session.client, req.session.client.cart.items);
        
        response.message = `You successfully logged in as ${user.name}!`;
        req.flash(response.message);
        return res.json(response);

        
    } catch (err) {
        response.message = `Could not log in to account with email ${email}: ` + err;
        response.success = false;
        req.flash('messages', response.message);
        return res.json(response);
    }
}

// middleware called upon /api/register posted by client
async function Register (req, res) {

    const username = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    const response = { success: true, message: null };

    try {
        // check if client object exists
        const client = req.session.client;
        if (client.userID) throw 'user already logged in';

        const userID = await UserManager.RegisterUser(username, email, password);
        if (!userID || userID == 0) throw 'registering returned null';
        
        // send userID back to client
        response.message = 'Registration was successful! You may now log in.';
        req.flash('messages', response.message);
        return res.json(response);

    } catch (err) {
        response.success = false;
        response.message = `error registering new user: ` + err;
        req.flash('messages', response.message);
        return res.json(response);
    }
    
}

async function Checkout (req, res) {
    const { name, address, city, zip } = req.body; // get order details

    let act, order;
    try { 
        const client = req.session.client;
        let cartID = client.cart.orderID;
        const cart = client.cart.items;

        const shipping = name + "-" + address + "-" + city + "-" + zip; // combine details with delimiter for splitting

        if (cart.length == 0) throw 'your cart is empty';

        if (!client.userID) { // guest places order
            const order = await InventoryManager.new_order(null, shipping, 'inactive', 0);
            cartID = order.orderID;

            cart.forEach(async item => { // create order_item for each item
                await InventoryManager.new_order_item(item.itemID, order.orderID, item.quantity);
                cart.splice(item);
            });
        }

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
        res.redirect('/');

        return res.redirect('/');
    } catch (err) { // error 
        req.flash('messages', 'There was an error placing your order.');
        res.redirect('/');
    }
        
}

async function RemoveBook (req, res) {
    const result = {
        success: true,
        message: null
    }

    // remove book from cart
    const bookId = req.params.isbn; // Get the book ID from the request
    const quantity = req.body.quantity * -1; // get quantity to remove (-)

    const user = req.session.client;
    const cartArr = req.session.client.cart.items;

    try { // Logic to remove the book from the cart
        
        // convert cart arr to map
        const cartMap = new Map(cartArr);
        const newNum = cartMap.get(bookId) - quantity;
        
        console.log(`removing ${quantity} items from cart. the new quantity should be ${newNum}`);

        //update cart
        await UserManager.UpdateUserCart(user, req.session.client.cart.items, [[bookId, quantity]]);


        result.message = 'Successfully removed book from cart!';
        req.flash('messages', result.message);
        return res.redirect('/cart');
    
    } catch (err) {
        result.message = 'There was an error removing book from cart: ' + err;
        req.flash('messages', result.message);
        return res.redirect('/');
    }   
}

//middleware for adding items to cart
async function AddCart (req, res) {

    const result = {
        success: true,
        message: null
    }
    // get bookID and quantity
    const bookId = req.params.isbn;
    const quantity = Number(req.body.quantity);

    try {

        const book = await InventoryManager.search_item('itemID', bookId); //get book to add by ID
        if (!book) throw 'item could not be found'; 

        if (book.stock < quantity) throw `you tried to order ${quantity} items, only ${book.stock} are in stock!`;

        // session client details
        const user = req.session.client;

        result.message = `You successfully added ${quantity} items with ISBN ${book.itemID} to your cart!`;

        // for logged in users sync with database
        
        await UserManager.UpdateUserCart(user, req.session.client.cart.items, [[bookId, quantity]]);
        
        req.flash('messages', result.message);
        return res.redirect('/catalog');
    
    } catch (err) {
        result.success = false;
        result.message = `Couldn't add item with ISBN ${bookId}: ` + err;

        req.flash('message', 'Error adding book to cart.');
        return res.redirect('/catalog');
    }
}

async function AddBook (req, res) {
    const result = {
        success: true,
        message: null
    };
    
    const isbn = req.body.isbn;
    const name = req.body.name;
    const author = req.body.author;
    const price = req.body.price;
    const stock = req.body.stock;
    const coverImage = req.files.coverImage[0].filename;

    const action = `Adding new book: {${isbn} ${name} ${author} $${price} ${stock}}`;

    let book = null;
    try {
        book = await InventoryManager.new_item(isbn, name, author, price, stock, coverImage);
        if (!book) throw `creating sequelize model instance returned null`;

        result.message = `${action} was successful!`;
        req.flash('messages', result.message);
        return res.redirect('/');
    } catch (err) {
        result.success = false;
        result.message = `Error ${action}! ` + err;
        req.session.flash('messages', result.message);
        return res.redirect('/');
    }
}


export default APIRouter;