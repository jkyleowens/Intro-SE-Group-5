const request = require('supertest');
const app = require('../app'); // Import your Express app
const db = require('../Backend/db'); // Mock database module
const bcrypt = require('bcrypt');

jest.mock('../Backend/db'); // Mock the database
jest.spyOn(bcrypt, 'compare'); // Spy on bcrypt.compare

describe('POST /login', () => {
  it('should return 200 for successful login', async () => {
    const mockUser = { id: 1, email: 'user@example.com', password: 'hashedPassword' };
    db.findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/login')
      .send({ email: 'user@example.com', password: 'securePass123' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful');
  });

  it('should return 401 for invalid email or', async () => {
    const mockUser = { id: 1, email: 'user@example.com', password: 'hashedPassword' };
    db.findUserByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    const response = await request(app)
      .post('/login')
      .send({ email: 'user@example.com', password: 'wrongPassword' });

    expect(response.status).toBe(401);
    expect(response.text).toBe('Invalid credentials');
  });

  it('should return 404 if user is not found', async () => {
    db.findUserByEmail.mockResolvedValue(null);

    const response = await request(app)
      .post('/login')
      .send({ email: 'nonexistent@example.com', password: 'securePass123' });

    expect(response.status).toBe(404);
    expect(response.text).toBe('User not found');
  });
});
