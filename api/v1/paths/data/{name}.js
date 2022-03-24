const path = require("path");
const dataController = require(path.resolve("bin/dataController."));

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {
        dataController.readfile(req.params.name, function (err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        });
    }

    GET.apiDoc = {
        security: [{ loginScheme: [] }],
        summary: "Read content of a file",
        description: "Read content of a file",
        operationId: "Read content of a file",
        parameters: [
            {
                name: "name",
                description: "name",
                in: "path",
                type: "string",
                required: true,
            },
        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object",
                },
            },
        },
    };

    return operations;
};
