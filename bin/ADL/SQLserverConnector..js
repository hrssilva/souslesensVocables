const sql = require('mssql')

const config = {
    user: 'sa',
    password: 'Fa1#majeur',
    server: '51.178.39.209', // You can use 'localhost\\instance' to connect to named instance
    database: 'rdlquantum',
}

//sudo docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=Fa1#majeur' -e 'MSSQL_PID=Express' -p 1433:1433 --restart always  -v /var/opt/mssql/data:/var/opt/mssql/data -v /var/opt/mssql/log:/var/opt/mssql/log -v /var/opt/mssql/secrets:/var/opt/mssql/secrets -d mcr.microsoft.com/mssql/server:2017-latest-ubuntu
var SQLserverConnector = {


    test: function () {

        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query

            new sql.Request().query('select * from rdl.tblAttributePickListValue', (err, result) => {
                if (err)
                    // ... error checks

                    console.dir(result)
            })
        })
    },

    getData: function (dbName, query, callback) {
        config.database=dbName
        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query

            new sql.Request().query(query, (err, result) => {
                if (err)
                  return callback(err)

                return callback(null,  result.recordset)
            })
        })
    },


    getADLmodel: function (dbName, callback) {


        var query = "SELECT COLUMN_NAME,TABLE_NAME\n" +
            "FROM INFORMATION_SCHEMA.COLUMNS\n" +
            "where  TABLE_SCHEMA='rdl'"

        sql.connect(config, err => {
            if (err)
                return console.log(err)// ... error checks

            // Query

            new sql.Request().query(query, (err, result) => {
                if (err)
                    return callback(err)

                var model = {}
                result.recordset.forEach(function (item) {
                    if (!model[item.TABLE_NAME]) {
                        model[item.TABLE_NAME] = []
                    }
                    model[item.TABLE_NAME].push(item.COLUMN_NAME)

                })
                return callback(err, model);
            })
        })

    }


}
module.exports = SQLserverConnector
//SQLserverConnector.getADLmodel()