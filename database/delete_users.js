const database = include("databaseConnection");

async function deleteUsers() {
    let deleteUserSQL = `
    DELETE FROM user
    `
    try {
        const results = await database.query(deleteUserSQL);
        console.log("successfully deleted users");
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
}
    module.exports = {deleteUsers};