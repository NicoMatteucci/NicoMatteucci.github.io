const { mongoClient } = require('mongodb')

let dbConnection

module.exports = {
    connectToDB: (cb) => {
        mongoClient.connect('mongodb://localhosht:27017/game_db')
            .then((client) => {
                dbConnection = client.db()
                return cb()
            })
            .catch(err => {
                console.log(err)
                return cb(err)
            })
    },
    getDB: () => dbConnection
}