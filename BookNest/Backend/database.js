import Databse from 'better-sqlite3'

const db = new Database('Database.db');

//WAL mode for better performance
db.pragma('journal_mode = WAL');

const database = new Database('Database.db');

