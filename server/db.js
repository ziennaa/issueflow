import Database from 'better-sqlite3';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export function openDB(filename=process.env.DATABASE_PATH||'data/issueflow.sqlite'){
 if(filename!==':memory:')mkdirSync(resolve(filename,'..'),{recursive:true});
 const sqlite=new Database(filename);sqlite.pragma('foreign_keys = ON');sqlite.pragma('journal_mode = WAL');
 if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE name='users'").get())sqlite.exec(readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
 const adapter={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}}}},async batch(statements){return sqlite.transaction(()=>statements.map(s=>s.run()))()}};
 return {sqlite,adapter};
}
if(process.argv[1]?.endsWith('/db.js')){const {sqlite}=openDB();sqlite.close();console.log('SQLite database is ready.');}
