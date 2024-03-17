

//const ManchesterSyntaxEngine = require("../../../../bin/axioms/manchesterSyntaxEngine.js");

//import    ManchesterSyntaxEngine from  "../../../../bin/axioms/manchesterSyntaxEngine.js";





const httpProxy = require("../../../../bin/httpProxy..js");
const { processResponse } = require("../utils.js");
module.exports = function() {
    let operations = {
        GET
    };

    function GET(req, res, _next) {
        const callback = function(err, result) {
            if (err) {
                return res.status(400).json({ error: err });
            }
            return res.status(200).json(result);
        };
        var options = {};
        if (req.query.options) {
            options = JSON.parse(req.query.options);
        }
     //  ManchesterSyntaxEngine.getSuggestion(req.query.source, req.query.lastToken, options, callback);
        var url="http://localhost:3000/getSuggestions"
        httpProxy.post(url, null, { owlInput:req.query.lastToken }, function(result) {
            processResponse(res, null, JSON.parse(result));
        });
    }

    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "Return a suggestion to builde an axiom",
        description: "Return a suggestion to build an axiom",
        operationId: "Return a suggestion to build an axiom",
        parameters: [
            {
                name: "source",
                description: "type",
                in: "query",
                type: "string",
                required: true
            },
            {
                name: "lastToken",
                description: "lastToken",
                in: "query",
                type: "string",
                required: true
            },
            {
                name: "options",
                description: "database name",
                in: "query",
                type: "string",
                required: false
            }

        ],

        responses: {
            200: {
                description: "Results",
                schema: {
                    type: "object"
                }
            }
        }
    };

    return operations;
};
