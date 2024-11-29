const request = require('supertest');
const app = require('../app'); // Adjust path to your app.js

describe('Catalog Page Route', () => {
    describe('GET /catalog', () => {
        test('Renders the catalog page successfully', async () => {
            const response = await request(app).get('/catalog');
            expect(response.status).toBe(200); // HTTP 200 OK
            expect(response.text).toContain('Welcome to BookNest'); // Check for text in the hero section
            expect(response.text).toContain('Crows and Silences'); // Check for a specific book title in the catalog
        });
        


        

    //     test('Handles unexpected server errors gracefully', async () => {
    //         // Mock res.render to simulate an error
    //         jest.spyOn(app, 'render').mockImplementationOnce((view, options, callback) => {
    //             callback(new Error('Server error'));
    //         });

    //         const response = await request(app).get('/catalog');
    //         expect(response.status).toBe(500); // HTTP 500 Internal Server Error
    //         expect(response.text).toContain('Internal Server Error'); // Custom error message
    //     });
 });
});
