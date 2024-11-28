// Define the mock database first
const mockDb = {
    run: jest.fn((sql, params, callback) => {
      if (typeof callback === 'function') {
        callback(null); // Simulate success
      }
    }),
    serialize: jest.fn((callback) => {
      if (typeof callback === 'function') {
        callback();
      }
    }),
    close: jest.fn(), // Simulate closing the DB
  };
  
  // Mock the sqlite3 module
  jest.mock('sqlite3', () => ({
    verbose: jest.fn(() => ({
      Database: jest.fn(() => mockDb),
    })),
  }));
  
  const request = require('supertest');
  const path = require('path');
  const app = require('../app'); // Import your app
  
  let server;

beforeAll(() => {
  // Start the server before tests
  server = app.listen(4000);
});

afterAll((done) => {
  // Close the server after tests
  server.close(done);
});

describe('POST /add-book', () => {
  it('should successfully add a book with valid data', async () => {
    const res = await request(server) // Use the server instead of app
      .post('/add-book')
      .field('name', 'Test Book')
      .field('author', 'Test Author')
      .field('price', 19.99);
    expect(res.status).toBe(200);
  });
});
  

// jest.mock('sqlite3', () => {
//   const mDb = {
//     run: jest.fn((sql, params, callback) => {
//       // Simulate the database success by calling the callback with no error
//       if (callback) callback(null);  // Ensure callback is called with null to simulate success
//     }),
//     serialize: jest.fn((callback) => { 
//       callback();  // Simulate the behavior of the serialize function
//     }),
//     // Optionally mock other methods like `get`, `all`, etc.
//   };

//   return { 
//     verbose: jest.fn().mockReturnValue({
//       Database: jest.fn(() => mDb)  // Mock the Database constructor
//     })
//   };
// });
// jest.setTimeout(30000);  // Set the timeout to 10 seconds (10000 ms)
// describe('POST /add-book', () => {
//   it('should successfully add a book with valid data', async () => {
//     const res = await request(app)
//       .post('/add-book')
//       .field('name', 'Test Book')
//       .field('author', 'Test Author')
//       .field('price', 19.99)
//       .attach('coverImage', path.join(__dirname, 'test-asset.jpg'));

//     expect(res.status).toBe(302);  // Assuming the route redirects on success
//     expect(res.text).toContain('Book added successfully!');
//   });

//   // Add other test cases as needed
// });
// jest.mock('fs', () => ({
//     ...jest.requireActual('fs'),
//     existsSync: jest.fn(() => true), // Mock fs.existsSync to always return true
//   }));
  
//   let db;

//   beforeAll(() => {
//     const { Database } = require('sqlite3');
//     db = new Database(); // Initialize mock database
//   });
  
//   afterAll(() => {
//     db.close(); // Ensure the database is closed after tests
//   });
afterAll(() => {
    mockDb.close(); // Close mock database
  });