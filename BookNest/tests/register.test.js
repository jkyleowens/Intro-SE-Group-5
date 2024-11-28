const request = require('supertest');
const app = require('../app'); // Import your Express app
const db = require('../Backend/db'); // Mock database module

jest.mock('../Backend/db'); // Mock the database
db.get = jest.fn();
db.run = jest.fn();
beforeEach(() => {
  db.get.mockImplementation((query, params, callback) => {
      if (params[0] === 'user@example.com') {
          callback(null, { email: 'user@example.com' }); // Simulate existing user
      } else {
          callback(null, null); // Simulate no existing user
      }
  });

  db.run.mockImplementation((query, params, callback) => {
      callback(null); // Simulate successful insertion
  });
});
afterEach(() => {
  jest.resetAllMocks();
});


describe('POST /register', () => {
  beforeEach(() => {
    db.get = jest.fn();
    db.run = jest.fn();

    db.get.mockImplementation((query, params, callback) => {
        if (params[0] === 'user@example.com') {
            callback(null, { email: 'user@example.com' }); // Default: Simulate existing user
        } else {
            callback(null, null); // Simulate no existing user
        }
    });

    db.run.mockImplementation((query, params, callback) => {
        callback(null); // Simulate successful insertion
    });
});
  
// it('should return 201 for successful registration', async () => {
//   db.get.mockImplementationOnce((query, params, callback) => {
//       callback(null, null); // First call simulates no existing user
//   });

//   const response = await request(app)
//       .post('/register')
//       .send({ username: 'testuser', email: 'user@example.com', password: 'securePass123', role: 'user' });

//   expect(response.status).toBe(201);
//   expect(response.body.email).toBe('user@example.com');
// });



  it('should return 400 if required fields are missing', async () => {
    const response = await request(app)
      .post('/register')
      .send({ email: '' });

    expect(response.status).toBe(400);
    expect(response.text).toBe('Missing fields');
  });

  it('should return 409 for duplicate email registration', async () => {
    db.get.mockImplementation((query, params, callback) => callback(null, { email: 'user@example.com' })); // Existing user

    const response = await request(app)
      .post('/register')
      .send({ username: 'testuser', email: 'user@example.com', password: 'securePass123', role: 'user' });

    expect(response.status).toBe(409);
    expect(response.text).toBe('Email already in use');
  });
});
