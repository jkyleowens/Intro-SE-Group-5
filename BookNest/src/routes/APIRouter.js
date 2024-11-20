import express from 'express';
import path from 'path';
import flash from 'connect-flash';
import multer from 'multer';

import InventoryManager from '../controllers/InventoryManager.js';
import UserManager from '../controllers/UserManager.js';

// router for essential frontend <---> backend operations
// catalog/cart, inventory and order management, account management

const APIRouter = express.Router();

export function SetupMulter(imgStore) {
    // project root dir
    const storage = multer.diskStorage({
        destination: imgStore, // Save images here

        filename: (req, file, cb) => { // unique fileName
            const isbn = req.body.isbn;
            const unique = Date.now() + '-' + isbn;
            const ext = '.jpg';

            cb(null, (unique + ext)); // Unique file name + extension
        },
    });
    const upload = multer({ storage: storage }); 
    APIRouter.post('/add-book', upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'isbn', maxCount: 1 }
    ]), AddBook);
}




// api
APIRouter.post('/register', Register);
APIRouter.post('/login', Login);
APIRouter.post('/add-cart', AddCart);
APIRouter.post('/remove-cart', RemoveBook);
APIRouter.post('/process-checkout', Checkout);
// add new book upon post from client



// middleware for login
export async function Login (req, res) {   
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
export async function Register (req, res) {

    const username = req.body.username;
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

export async function Checkout (req, res) {
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

export async function RemoveBook (req, res) {
    const result = {
        success: true,
        message: null
    }

    // remove book from cart
    const bookId = req.body.isbn; // Get the book ID from the request
    const quantity = req.body.quantity; // get quantity to remove

    console.log(`removing ${quantity} of item ${bookId}`);

    const user = req.session.client;

    try { // Logic to remove the book from the cart

        //update cart
        await UserManager.UpdateUserCart(user, req.session.client.cart.items, [[bookId, quantity]]);

        result.message = 'Successfully removed book from cart!';
        req.flash('messages', result.message);
        return res.json(result);
    
    } catch (err) {
        result.message = 'There was an error removing book from cart: ' + err;
        result.success = false;
        req.flash('messages', result.message);
        return res.json(result);
    }   
}

//middleware for adding items to cart
export async function AddCart (req, res) {

    const result = {
        success: true,
        message: null
    }
    // get bookID and quantity
    const bookId = req.body.isbn;
    const quantity = req.body.quantity;

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
        return res.json(result);
    
    } catch (err) {
        result.success = false;
        result.message = `Couldn't add item with ISBN ${bookId}: ` + err;

        req.flash('message', 'Error adding book to cart.');
        return res.json(result);
    }
}

export async function AddBook (req, res) {
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