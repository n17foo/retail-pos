import * as SQLite from 'expo-sqlite';
import { initializeSchema } from './dbSchema';

const db = SQLite.openDatabaseSync('retailPOS.db');
initializeSchema(db);

export { db };
