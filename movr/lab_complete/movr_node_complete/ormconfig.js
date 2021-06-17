const fs = require('fs');

module.exports = {
   "name": "default",
   "type": "cockroachdb",
   "host": process.env.DB_HOST,
   "port": process.env.DB_PORT,
   "username": process.env.DB_USERNAME,
   "password": process.env.DB_PASSWORD,
   "database": process.env.DB_DBNAME,
   "synchronize": false,
   "logging": false,
   "ssl":{
      "ca": fs.readFileSync(process.env.SSL_CERT)
   },
   "entities": [
      "src/entity/**/*.ts"
   ],
   "migrations": [
      "src/migration/**/*.ts"
   ],
   "subscribers": [
      "src/subscriber/**/*.ts"
   ],
   "cli": {
      "entitiesDir": "src/entity",
      "migrationsDir": "src/migration",
      "subscribersDir": "src/subscriber"
   }
}