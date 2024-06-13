const { processResponse } = require("../utils");
const ConfigManager = require("../../../../bin/configManager.");
const httpProxy = require("../../../../bin/httpProxy.");
const {INIT_REPO_BODY, INIT_REPO_URL, QUERY_BODY, QUERY_URL} = require("./ontopParams/ontopParams");

module.exports = function () {
    let operations = {
        POST,
    };

    async function POST(req, res, next) {
        const allowedOperationIds = ["init_repo", "query"];
        let operationId = req.body.operationId;
        if (!allowedOperationIds.includes(operationId)) {
            return res.status(400).json({ error: "missing valid operationId. Must be either initRepo or query" });
        }
        var jowlConfig = ConfigManager.config.jowlServer;

        if (operationId === "init_repo") {
            const url = jowlConfig.url + INIT_REPO_URL;
            httpProxy.post(url, null, INIT_REPO_BODY, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    return processResponse(res, err, JSON.parse(result));
                }
            });
        }
        if (operationId === "query") {
            const url = jowlConfig.url + QUERY_URL;
            httpProxy.post(url, null, QUERY_BODY, function (err, result) {
                if (err) {
                    next(err);
                } else {
                    return processResponse(res, err, JSON.parse(result));
                }
            });
        }
    }

    POST.apiDoc = {
        summary: "Ontop API",
        security: [{ restrictLoggedUser: [] }],
        parameters: [
            {
                name: "body",
                description: "body",
                in: "body",
                schema: {
                    type: "object",
                    properties: {
                        operationId: {
                            type: "string",
                            enum: ["init_repo", "query"],
                        },
                    },
                },
            },
        ],
        responses: {
            200: {
                description: "Response",
                schema: {},
            },
        },
    };

    return operations;
};
