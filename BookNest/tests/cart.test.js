const request = require('supertest');
const express = require('express');
const session = require('express-session');
const app = express();
const mockSession = require('supertest-session'); // Ensure you have this package installed


// Middleware setup
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/../views`); // Adjust path to your views folder
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'testSecret', resave: false, saveUninitialized: true }));

// Mock route
app.get('/cart', (req, res) => {
    const cart = req.session.cart || []; // Retrieve the cart from session
    const totalPrice = req.session.totalPrice || 0; // Get total price from session, default to 0 if not set

    res.render('pages/cart', { 
        cart: cart,
        totalPrice: totalPrice 
    });
});

// Test suite
describe('GET /cart', () => {
    it('should render the cart page with an empty cart and total price of 0', async () => {
        // No mock middleware, session defaults to empty
        const response = await request(app).get('/cart');
        expect(response.status).toBe(200);
        expect(response.text).toContain('Your cart is empty');
        expect(response.text).toContain('Total Price: $0.00');
    });
    



});
