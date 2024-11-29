const request = require('supertest');
const app = require('../app'); // Adjust the path to your app.js
const db = require('../Backend/db'); // Mock or real database instance

jest.mock('../db'); // Mock database to prevent real DB operations

describe('Admin Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear any previous mock implementations
    });

    describe('POST /admin/delete-user', () => {
    
        test('Fails when userId is missing', async () => {
            const response = await request(app).post('/admin/delete-user').send({});
            expect(response.status).toBe(400);
            expect(response.text).toBe('User ID is required');
        });

       
    });

    
        test('Fails when bookId is missing', async () => {
            const response = await request(app).post('/admin/delete-book').send({});
            expect(response.status).toBe(400);
            expect(response.text).toBe('Book ID is required');
        });

        
    });

