const database = include('databaseConnection');

async function createTables() {
    let createUserSQL = `CREATE TABLE IF NOT EXISTS user (
        user_id INT NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(100) NOT NULL,
        PRIMARY KEY (user_id),
        UNIQUE INDEX unique_username (username ASC) VISIBLE);`;

        try {
            const results = await database.query(createUserSQL);
            console.log("successfully created tables");
            console.log(results[0]);
            return true;
        } catch (e) {
            console.log("Error creating tables " + e);
            return false
        }
    }
    module.exports = {createTables};