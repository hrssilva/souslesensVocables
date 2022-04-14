var fs = require("fs");
const async = require("async");
var sax = require("sax");
var util = require("../../bin/util.");
var httpProxy = require("../../bin/httpProxy.");
var SPARQLutil = require("../../bin/SPARQLutil.");

var xml2js = require("xml2js");

var topParentTag;
var triples = "";
var currentTriple = "";
var currentUri = "";

var line = 0;

var currentParent;
var currentAttr;
var currentX;
var currentNodeName;

var currentNodePath = "";
var currentObjects = {};
var currentParentObj;

var buildOwl = function (json, graphUri) {
    var triples = [];
    var classesMap = {};
    var objectPropertiesTriples = [];
    var enumTriples = [];
    var dataTypePropertiesTriples = [];
    var restrictionsTriples = [];
    var propertiesMap = {};
    var blankNodeIndex = 0;

    // var json = JSON.parse("" + fs.readFileSync(jsonPath));
    for (var topClassKey in json) {
        var items = json[topClassKey];
        var packages = {};
        var topClassUri;

        topClassUri = graphUri + util.formatStringForTriple(topClassKey, true);

        triples.push({
            subject: topClassUri,
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "owl:Class",
        });

        triples.push({
            subject: topClassUri,
            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
            object: "'" + util.formatStringForTriple(util.decapitalizeLabel(topClassKey)) + "'",
        });
        triples.push({
            subject: topClassUri,
            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
            object: "http://souslesens.org/resource/vocabulary/TopConcept",
        });

        var properties = json[topClassKey].Data.IndividualTypeProperties;
        for (var aclass in properties) {
            var className = aClass.name;
            if (!className) return;

            var uri = graphUri + util.formatStringForTriple(aClass.name, true);

            if (!classesMap[className]) {
                classesMap[className] = uri;

                triples.push({
                    subject: uri,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "owl:Class",
                });

                triples.push({
                    subject: uri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: "'" + util.formatStringForTriple(util.decapitalizeLabel(className)) + "'",
                });
                if (aClass.documentation) {
                    triples.push({
                        subject: uri,
                        predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                        object: "'" + util.formatStringForTriple(aClass.documentation) + "'",
                    });
                }
                triples.push({
                    subject: uri,
                    predicate: "http://rds.posccaesar.org/ontology/lis14/ont/core/1.0/partOf",
                    object: topClassUri,
                });
            }

            var className = aClass.name.toLowerCase();
            if (aClass.elements) {
                aClass.elements.forEach(function (element) {
                    if (element.name == "GeochronologicalUnit") var x = 3;
                    var type = element.type;
                    if (!type) return;
                    var typeArray = type.split(":");
                    var propUri = propertiesMap[element.name];

                    //create property once
                    if (!propUri) {
                        var propLabel = util.formatStringForTriple("has" + element.name);
                        propUri = graphUri + "has" + util.formatStringForTriple(element.name, true);
                        propertiesMap[element.name] = propUri;

                        objectPropertiesTriples.push({
                            subject: propUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                            object: "'" + propLabel + "'",
                        });

                        if (typeArray[0] == "xs") {
                            objectPropertiesTriples.push({
                                subject: propUri,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: "owl:DataTypeProperty",
                            });
                        } else {
                            objectPropertiesTriples.push({
                                subject: propUri,
                                predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                object: "owl:ObjectProperty",
                            });
                        }
                    }

                    //type=prefix:xx -> partOf xx and restriction
                    if (typeArray[1].endsWith("Ext")) {
                        typeArray[1] = typeArray[1].replace("Ext", "");
                    }
                    var elementUri;
                    if (typeArray[0] == "xs") elementUri = "http://www.w3.org/2001/XMLSchema" + typeArray[1];
                    else if (typeArray[0] != prefix) elementUri = graphUri.replace(prefix, typeArray[0]) + typeArray[1];
                    else elementUri = graphUri + typeArray[1];

                    // var elementUri = graphUri + typeArray[1]
                    if (typeArray[0] == prefix) {
                        triples.push({
                            subject: elementUri,
                            predicate: "http://standards.iso.org/iso/15926/part14/partOf",
                            object: uri,
                        });
                    } else {
                        //type==eml x rdf:type
                        //type==xs:xx -> datatype property
                        //restrictions
                        var blankNode = "_:b" + blankNodeIndex++;

                        restrictionsTriples.push({
                            subject: uri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                            object: blankNode,
                        });

                        restrictionsTriples.push({
                            subject: blankNode,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#Restriction",
                        });
                        restrictionsTriples.push({
                            subject: blankNode,
                            predicate: "http://www.w3.org/2002/07/owl#onProperty",
                            object: propUri,
                        });
                        restrictionsTriples.push({
                            subject: blankNode,
                            predicate: "http://www.w3.org/2002/07/owl#someValuesFrom",
                            object: elementUri,
                        });
                    }
                });
            }
            if (aClass.name == "MatrixCementKind") var x = 3;

            if (aClass.enumerations) {
                var enumsMap = {};
                var classUri = graphUri + aClass.name;
                aClass.enumerations.forEach(function (itemEnum) {
                    var enumLabel = itemEnum.value;
                    if (!enumsMap[enumLabel]) {
                        enumsMap[enumLabel] = 1;
                        var enumUri = graphUri + util.getRandomHexaId(10);
                        enumTriples.push({
                            subject: enumUri,
                            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                            object: "'" + util.formatStringForTriple(enumLabel) + "'",
                        });
                        enumTriples.push({
                            subject: enumUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: classUri,
                        });
                        enumTriples.push({
                            subject: enumUri,
                            predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                            object: "http://www.w3.org/2002/07/owl#NamedIndividual",
                        });

                        if (itemEnum.documentation) {
                            enumTriples.push({
                                subject: enumUri,
                                predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                                object: "'" + util.formatStringForTriple(itemEnum.documentation) + "'",
                            });
                        }
                    }
                });
            }

            if (!classesMap[topClassKey]) {
                topClassUri = graphUri + util.formatStringForTriple(topClassKey, true);
                triples.push({
                    subject: topClassUri,
                    predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                    object: "owl:Class",
                });

                triples.push({
                    subject: topClassUri,
                    predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                    object: "'" + util.formatStringForTriple(util.decapitalizeLabel(topClassKey)) + "'",
                });
            }
        }
    }

    //return;
    var allTriples = [];
    allTriples = allTriples.concat(triples);
    allTriples = allTriples.concat(objectPropertiesTriples);
    allTriples = allTriples.concat(dataTypePropertiesTriples);
    allTriples = allTriples.concat(restrictionsTriples);
    allTriples = allTriples.concat(enumTriples);
    /*  allTriples = allTriples.concat(subClassTriples);*/

    var slicedTriples = util.sliceArray(allTriples, 1000);
    var uniqueTriples = {};

    var totalTriples = 0;
    var sparqlServerUrl = "http://51.178.139.80:8890/sparql";

    async.series(
        [
            function (callbackSeries) {
                var queryGraph = "CLEAR GRAPH <" + graphUri + ">";
                var params = { query: queryGraph };
                httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                    return callbackSeries(err);
                });
            },
            function (callbackSeries) {
                async.eachSeries(
                    slicedTriples,
                    function (triples, callbackEach) {
                        //    return callbackEach();
                        var triplesStr = "";
                        triples.forEach(function (triple) {
                            var subject = triple.subject;
                            if (subject.indexOf("_:b") == 0);
                            else subject = "<" + subject + ">";

                            var value = triple.object;
                            if (value.indexOf("_:b") == 0);
                            else if (value.indexOf("http") == 0) value = "<" + value + ">";
                            var tripleStr = subject + " <" + triple.predicate + "> " + value + ".\n";
                            var tripleHash = util.hashCode(tripleStr);
                            if (uniqueTriples[tripleHash]) return;
                            else {
                                uniqueTriples[tripleHash] = 1;
                                triplesStr += tripleStr;
                            }
                        });
                        var queryGraph =
                            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" + "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" + "PREFIX owl: <http://www.w3.org/2002/07/owl#> ";
                        queryGraph += "with <" + graphUri + ">" + "insert {";
                        queryGraph += triplesStr;

                        queryGraph += "}";

                        var params = { query: queryGraph };

                        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
                            if (err) {
                                var x = queryGraph;
                                return callbackEach(err);
                            }
                            totalTriples += triples.length;
                            console.log(totalTriples);
                            return callbackEach(null);
                        });
                    },
                    function (err) {
                        return callbackSeries(err);
                    }
                );
            },
        ],
        function (err) {
            if (err) {
                console.log(err);
            }
            return console.log("DONE " + totalTriples);
        }
    );
};
/***********************************************************************************************************************************************/
/***********************************************************************************************************************************************/

var sourcePath = "D:\\NLP\\ontologies\\energistics\\common\\v2.1\\xsd_schemas\\CommonEnumerations.xsd";

var dirPathMasterData = { dir: "D:\\NLP\\ontologies\\OSDU\\301018_Shell_SDU_JSON_Schemas_for_OSDU\\resource-group-type__master-data\\", prefix: "master_data" };

if (true) {
    var doAll = false;
    var currentDir = dirPathMasterData;

    //  var currentDir = dirPathCommon
    var dirPath = currentDir.dir;
    var prefix = currentDir.prefix;

    var graphUri = "http://souslesens.org/osdu/ontology/" + prefix + "/";

    async.series(
        [
            //concat all json together
            function (callbackSeries) {
                if (!doAll) return callbackSeries();

                var globalJson = {};
                var dirPaths = [dirPath];
                async.eachSeries(
                    dirPaths,
                    function (dirPath, callbackEachDir) {
                        var files = fs.readdirSync(dirPath);
                        async.eachSeries(
                            files,
                            function (file, callbackEach) {
                                if (file.endsWith(".json")) {
                                    var json = JSON.parse(fs.readFileSync(dirPath + file));
                                    var objName = file.substring(0, file.indexOf("."));
                                    var obj = (globalJson[objName] = json);
                                    // globalJson = globalJson.concat(jsonFile);
                                    callbackEach();
                                } else callbackEach();
                            },
                            function (err) {
                                callbackEachDir(err);
                            }
                        );
                    },
                    function (err) {
                        if (err) return callbackSeries(err);
                        fs.writeFileSync(dirPath + prefix + "merged.json", JSON.stringify(globalJson, null, 2));
                        callbackSeries(err);
                        console.log("done");
                    }
                );
            },
            //concat all json together
            function (callbackSeries) {
                var json = JSON.parse(fs.readFileSync(dirPath + prefix + "merged.json"));
                buildOwl(json, graphUri);
            },
        ],
        function (err) {}
    );
}
