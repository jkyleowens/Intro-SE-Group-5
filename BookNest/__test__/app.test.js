import supertest from 'supertest';
import app from '../app.js';

describe('Express App', () => {
    it('POST /api/login should return successful', async () => {
        const response = await request(app)
        .post('/api/login')
        .send({ email:'testemail@booknest.io', password:'testpassword' });
        expect(response.status).toBe(200);
    });

    it('POST /api/register should return unsuccessful', async () => {
        const response = await request(app)
        .post('/api/register')
        .send({ username: 'testuser', email:'testemail@booknest.io', password:'testpassword' });
        expect(response.message).toBe(`error registering new user: user with username testuser already exists!`);
    });
});