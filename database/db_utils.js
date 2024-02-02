const database = include ('databaseConnection');

async function printMySQLVersion() {
    let sqlQuery = `SHOW VARIABLES LIKE 'version';`;

    try {
        const results = await database.query(sqlQuery);
        console.log("Successfully connected to MYSQL");
        console.log(results[0]);
        return true;
    } catch (e) {
        console.log("Error getting version from MYSQL");
        console.log(e);
        return false;
    }
}

module.exports = {printMySQLVersion}