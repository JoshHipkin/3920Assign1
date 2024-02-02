const mysql = require('mysql2/promise');

const dbConfiguration = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: false,
    namedPlaceholders: true
};

var database = mysql.createPool(dbConfiguration);

module.exports = database