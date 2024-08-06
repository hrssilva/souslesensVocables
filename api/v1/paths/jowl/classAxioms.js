
const { processResponse } = require("../utils");
const request = require("request");
const async = require("async");

//https://jena.apache.org/documentation/inference/

module.exports = function () {
    let operations = {
        GET,
    };

    function GET(req, res, next) {

        var jowlConfigUrl="https://sls.kg-alliance.org/jowl/manchester/getClassAxioms"

        var payload={
            "graphName": req.query.graphUri,
            "classUri":   req.query.classUri,
            "tripleFormat": req.query.getTriples?true:false,
            "manchetserFormat": req.query.getManchesterExpression?true:false,

        }
        if(req.query.axiomType)
            payload.axiomType=req.query.axiomType
        if(req.query.getTriples)
            payload.getTriples=true
        if(req.query.getManchesterExpression)
            payload.manchetserFormat=true

                    var options = {
                        method: "POST",
                        json: payload,
                        headers: {
                            "content-type": "application/json",
                        },
                        url: jowlConfigUrl,
                    };
                    request(options, function (error, response, body) {
                        return processResponse(res, error, body);
                    });
                }


    GET.apiDoc = {
        security: [{ restrictLoggedUser: [] }],
        summary: "get existing axioms for a class from owl API",
        description:  "get existing axioms for a class from owl API",
        operationId:  "get existing axioms for a class from owl API",
        parameters: [
            {
                name: "graphUri",
                description: "ontologyGraphUri",
                type: "string",
                in: "query",
                required: true,
            },
            {
                name: "classUri",
                description: "class URI",
                in: "query",
                type: "string",
                required: true,
            },
            {
                name: "axiomType",
                description: "axiomType",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "getTriples",
                description: "getTriples",
                in: "query",
                type: "string",
                required: false,
            },
            {
                name: "getManchesterExpression",
                description: "getManchesterExpression",
                in: "query",
                type: "string",
                required: false,
            }
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
