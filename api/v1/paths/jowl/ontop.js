const { processResponse } = require("../utils");
const ConfigManager = require("../../../../bin/configManager.");
const httpProxy = require("../../../../bin/httpProxy.");
const request = require("request");
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
            var options = {
                method: "POST",
                json: INIT_REPO_BODY,
                headers: {
                    "content-type": "application/json"
                },
                url: url
            };
            request(options, function(error, response, body) {
                return processResponse(res, error, body);
            });
        }
        if (operationId === "query") {
            const url = jowlConfig.url + QUERY_URL;
            var options = {
                method: "POST",
                json: QUERY_BODY,
                headers: {
                    "content-type": "application/json"
                },
                url: url
            };
            request(options, function(error, response, body) {
                return processResponse(res, error, body);
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
