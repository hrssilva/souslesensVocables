var fs = require("fs");
var path = require("path");
var csvCrawler = require("../bin/_csvCrawler.");
var async = require("async");
var util = require("../bin/util.");
var httpProxy = require("../bin/httpProxy.");
var UML2OWLparser = require("./UML2OWLparser");

//var rootDir = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS V1.5\\CFIHOS V1.5 RDL";
var sparqlServerUrl = "http://51.178.139.80:8890/sparql";
var processor = {
    readCsv: function (filePath, callback) {
        csvCrawler.readCsv({filePath: filePath}, 500000, function (err, result) {
            if (err) return callback(err);
            var data = result.data;
            var headers = result.headers;
            return callback(null, {headers: headers, data: data});
        });
    },

    getDescription: function (filePath) {
        var descriptionMap = {};


        processor.readCsv(filePath, function (err, result) {
                descriptionMap = {filePath: filePath, headers: result.headers, length: result.data[0].length};

                fs.writeFileSync(filePath.replace(".txt", "description.json"), JSON.stringify(descriptionMap, null, 2));
                //  console.log(JSON.stringify(descriptionMap,null,2))
            }
        );
    },

    processSubClasses: function (mappings, graphUri) {
        //  var graphUri = "https://www.jip36-cfihos.org/ontology/cfihos_1_5/test/"

        var existingNodes = {}
        var propertiesTypeMap = {
            "rdfs:subClassOf": "uri",
            _restriction: "uri",
            "rdfs:label": "string",
            "skos:definition": "string",
            "skos:notation": "string",
            "owl:comment": "string",
            //   "cfihos:status": "string",
            "iso14224:priority": "string",
            "rdf:type": "uri",
            "part14:functionalPartOf": "uri",
            "part14:assembledPartOf": "uri",
            "part14:hasFunctionalPart": "uri",
            "part14:hasAssembledPart": "uri",
            "skos:prefLabel": "string",
            "req:REQ_0020": "uri",
            "req:REQ_0021": "uri",
            "req:REQ_0022": "uri",

        };

        async.eachSeries(
            mappings,
            function (mapping, callbackEachMapping) {
                var fileName = mapping.fileName;
                var filePath = fileName;
                var lookUpMap = {};
                var triples = [];

                async.series(
                    [
                        // load Lookups
                        function (callbackSeries) {
                            if (mapping.lookups.length == 0)
                                return callbackSeries()

                            async.eachSeries(
                                mapping.lookups,
                                function (lookup, callbackEachLookup) {
                                    var lookupFileName = lookup.fileName;
                                    var lookupFilePath = rootDir + path.sep + lookupFileName;

                                    processor.readCsv(lookupFilePath, function (err, result) {
                                        if (err) return callbackEachLookup(err);
                                        var lookupLines = result.data[0];
                                        lookUpMap[lookup.name] = {};
                                        lookupLines.forEach(function (line, index) {
                                            if (![line[lookup.sourceColumn]] && line[lookup.targetColumn]) return console.log("missing lookup line" + index + " " + lookupFilePath);
                                            lookUpMap[lookup.name][line[lookup.sourceColumn]] = line[lookup.targetColumn];
                                        });

                                        callbackEachLookup();
                                    });
                                },
                                function (err) {
                                    callbackSeries();
                                }
                            );
                        },

                        //build triples
                        function (callbackSeries) {
                            function getLookupValue(lookupSequence, value) {
                                var lookupItem = lookupSequence.split("|");
                                var target = value;
                                lookupItem.forEach(function (lookupItem) {
                                    if (lookUpMap[lookupItem]) {
                                        target = lookUpMap[lookupItem][target];
                                        if (!target) {
                                            console.log("lookup value not found " + value + ": ");
                                            return "";
                                        }
                                    } else return target;
                                });

                                return target;
                            }

                            processor.readCsv(filePath, function (err, result) {
                                if (err) return callbackSeries(err);

                                var lines = result.data[0];
                                lines.forEach(function (line, indexLine) {
                                    if (false && indexLine > 2) return;
                                    var hasDirectSuperClass = false;
                                    var subjectStr = null;
                                    var objectStr = null;
                                    mapping.tripleModels.forEach(function (item) {
                                        subjectStr = null;
                                        objectStr = null;

                                        if (item.s_type == "fixed")
                                            subjectStr = item.s;
                                       else if (item.s.match(/.+:.+|http.+/))
                                            subjectStr = item.s;
                                        else
                                            subjectStr = line[item.s];
                                        if (item.o_type == "fixed")
                                            objectStr = item.o;
                                       else if (item.o.match(/.+:.+|http.+/))
                                            objectStr = item.o;
                                        else
                                            objectStr = line[item.o];

                                        if (item.p == "rdfs:subClassOf") hasDirectSuperClass = true;


                                        if (!subjectStr ||!objectStr)
                                            return;

                                            if (item.lookup_S) {
                                                subjectStr = getLookupValue(item.lookup_S, subjectStr);
                                                if (!subjectStr) {
                                                    // console.log(line[item.s])
                                                    return;
                                                }
                                            }
                                        if (subjectStr.indexOf("http") == 0)
                                            subjectStr = "<" + subjectStr + ">";
                                        else if (subjectStr.indexOf(":") > -1)
                                            subjectStr = subjectStr
                                        else
                                            subjectStr = "<" + graphUri + util.formatStringForTriple(subjectStr, true) + ">";


                                        if (!objectStr)
                                            objectStr = line[item.o];

                                        if (item.lookup_O) {
                                            objectStr = getLookupValue(item.lookup_O, objectStr);
                                            if (!objectStr) {
                                                // console.log(line[item.o])
                                                return;
                                            }
                                        }

                                        if (mapping.transform && mapping.transform[item.o])
                                            objectStr = mapping.transform[item.o](objectStr)

                                        if (propertiesTypeMap[item.p] == "string") {

                                            objectStr = "'" + util.formatStringForTriple(objectStr) + "'";
                                        } else if (propertiesTypeMap[item.p] == "uri") {
                                            if (objectStr.indexOf("http") == 0)
                                                objectStr = "<" + objectStr + ">";
                                            else if (objectStr.indexOf(":") > -1)
                                                objectStr = objectStr
                                            else
                                                objectStr = "<" + graphUri + util.formatStringForTriple(objectStr, true) + ">";
                                        }
                                        if (item.p == "_restriction") {

                                            if (!item.prop) {
                                                return callbackSeries("no prop defined for restriction");
                                            }
                                            var blankNode = "<_:b" + util.getRandomHexaId(10) + ">";
                                            var prop = item.prop;
                                            if (prop.indexOf("http") == 0)
                                                prop = "<" + item.prop + ">"
                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>",
                                                o: "<http://www.w3.org/2002/07/owl#Restriction>",
                                            });
                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/2002/07/owl#onProperty>",
                                                o: prop,
                                            });
                                            triples.push({
                                                s: blankNode,
                                                p: "<http://www.w3.org/2002/07/owl#someValuesFrom>",
                                                o: objectStr,
                                            });
                                            triples.push({
                                                s: subjectStr,
                                                p: "rdfs:subClassOf",
                                                o: blankNode,
                                            });
                                            objectStr = blankNode;
                                            return;
                                        }
                                        if (subjectStr && objectStr) {

                                            // return console.log("missing type " + item.p)
                                            if (!existingNodes[subjectStr + "_" + objectStr]) {
                                                triples.push({
                                                    s: subjectStr,
                                                    p: item.p,
                                                    o: objectStr,
                                                });
                                            }
                                        }

                                    });

                                    if ( !existingNodes[subjectStr + "_" + objectStr]) {
                                        existingNodes[subjectStr] = 1
                                        if (mapping.type) {
                                            triples.push({
                                                s: subjectStr,
                                                p: "rdf:type",
                                                o: mapping.type,
                                            });
                                        }

                                        if (mapping.topClass && !hasDirectSuperClass && mapping.type == "owl:Class") {
                                            triples.push({
                                                s: subjectStr,
                                                p: "rdfs:subClassOf",
                                                o: mapping.topClass,
                                            });
                                        }
                                    }
                                    var x = triples;
                                });

                                var x = triples;
                                callbackSeries();
                            });
                        },

                        //write triples
                        function (callbackSeries) {
                            var totalTriples = 0;

                            var slices = util.sliceArray(triples, 200);
                            async.eachSeries(
                                slices,
                                function (slice, callbackEach) {

                                    processor.writeTriples(slice, graphUri, sparqlServerUrl, function (err, result) {
                                        if (err)
                                            return callbackEach(err);
                                        totalTriples += result;

                                        callbackEach();
                                    })

                                },
                                function (err) {
                                    console.log("------------" + filePath + " " + totalTriples)
                                    callbackSeries();
                                }
                            );
                        },
                    ],
                    function (err) {
                        callbackEachMapping();
                    }
                );
            },
            function (err) {
            }
        );
    },
    writeTriples: function (triples, graphUri, sparqlServerUrl, callback) {
        var insertTriplesStr = ""
        var totalTriples = 0
        triples.forEach(function (triple) {
            var str = triple.s + " " + triple.p + " " + triple.o + ". ";
            //   console.log(str)
            insertTriplesStr += str
        });

        var queryGraph =
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#> " +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
            "PREFIX iso14224: <http://data.total.com/resource/tsf/iso_14224#>" +
            "PREFIX req: <https://w3id.org/requirement-ontology/rdl/>" +


            "PREFIX part14: <http://standards.iso.org/iso/15926/part14/>" +
            "";

        queryGraph += " WITH GRAPH  <" + graphUri + ">  " + "INSERT DATA" + "  {" + insertTriplesStr + "  }";
        // console.log(query)

        //  queryGraph=Buffer.from(queryGraph, 'utf-8').toString();
        var params = {query: queryGraph};

        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                var x = queryGraph
                return callback(err);
            }
            totalTriples += triples.length;
            console.log(totalTriples);
            return callback(null, totalTriples);
        })
    }

    , clearGraph: function (graphUri, sparqlServer, callback) {
        var query = "clear graph   <" + graphUri + ">"
        var params = {query: query};

        httpProxy.post(sparqlServerUrl, null, params, function (err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null);
        })
    }
};


mappingsMapV0 = {

    SYSTEMS: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
        fileName: "D:\\NLP\\ontologies\\14224\\systems.txt",
        lookups: [],
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},

        ],
    },
    CLASSES_3: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_3.txt",
        lookups: [],
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            {s: "id", p: "_restriction", o: "system", prop: "part14:functionalPartOf"},

        ],
    },
    CLASSES_4: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_4.txt",
        lookups: [],
        tripleModels: [
            {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},

        ],
    },
    CLASSES_5: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/z018-rdl/prod_COMP>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_5.txt",
        lookups: [],
        tripleModels: [

            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            {s: "id", p: "_restriction", o: "superClass", prop: "part14:functionalPartOf"},


        ],
    },
    CLASSES_6: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6.txt",
        lookups: [],
        tripleModels: [

            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            {s: "id", p: "_restriction", o: "superClass", prop: "part14:assembledPartOf"},


        ],
    },
}
mappingsMap = {

    SYSTEMS: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
        fileName: "D:\\NLP\\ontologies\\14224\\systems.txt",
        lookups: [],
        transform: {
            label2: function (value) {
                return "Syst-" + value
            }
        },
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},

        ],
    },
    CLASSES_3: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_3.txt",
        transform: {
            label2: function (value) {
                return "Pack-" + value
            }
        },
        lookups: [],
        tripleModels: [
            // {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            {s: "id", p: "_restriction", o: "system", prop: "part14:hasFunctionalPart"},

        ],
    },
    CLASSES_4: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_4.txt",
        lookups: [],
        transform: {
            label2: function (value) {
                return "Class" + value
            }
        },
        tripleModels: [
            {s: "id", p: "rdfs:subClassOf", o: "superClass"},
            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            //  {s: "id", p:"_restriction" , o: "system",prop:"part14:functionalPartOf"},

        ],
    },
    CLASSES_5: {
        type: "owl:Class",
        topClass: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_5.txt",
        transform: {
            label2: function (value) {
                return "Fn-" + value
            }
        },
        lookups: [],
        tripleModels: [

            {s: "id", p: "skos:prefLabel", o: "label1"},
            {s: "id", p: "rdfs:label", o: "label2"},
            {s: "id", p: "_restriction", o: "superClass", prop: "part14:hasFunctionalPart"},


        ],
    },
    CLASSES_6: {
        type: "owl:Class",
        topClass: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
        fileName: "D:\\NLP\\ontologies\\14224\\classes_6.txt",
        transform: {
            label2: function (value) {
                return "Cmpt-" + value
            }
        },
        lookups: [],
        tripleModels: [

            {s: "component", p: "skos:prefLabel", o: "componentCode"},
            {s: "component", p: "rdfs:label", o: "label2"},
            {s: "component", p: "_restriction", o: "superClass", prop: "part14:hasAssembledPart"},
            {s: "component", p: "_restriction", o: "class4", prop: "part14:hasAssembledPart"},


        ],
    },
    // Equipment	Attribute	Description	Unit_Code_List	Priority
    QUALITIES: {
        //   type: "owl:NamedIndividual",
        topClass: null,
        fileName: "D:\\NLP\\ontologies\\14224\\qualities.txt",
        transform: {
            attribute: function (value) {
                return "Qty-" + value
            },
            priority: function (value) {
                if (value == "High")
                    return "https://w3id.org/requirement-ontology/rdl/REQ_0011"
                else if (value == "Low")
                    return "https://w3id.org/requirement-ontology/rdl/REQ_0010"
                else
                    return "https://w3id.org/requirement-ontology/rdl/REQ_0007"

            },


        },
        lookups: [],
        tripleModels: [


            {s: "req:REQ_0008", p: "rdf:type", o: "owl:ObjectProperty"},
            {s: "req:REQ_0008", p: "rdfs:label", o: "has SCD clause", o_type: "fixed"},
            {s: "req:REQ_0020", p: "rdf:type", o: "owl:ObjectProperty"},
            {s: "req:REQ_0020", p: "rdfs:label", o: "#has demand", o_type: "fixed"},
            {s: "req:REQ_0021", p: "rdf:type", o: "owl:ObjectProperty"},
            {s: "req:REQ_0021", p: "rdfs:label", o: "has scope", o_type: "fixed"},

            {s: "clauseId", p: "rdf:type", o: "priority"},
            {s: "clauseId", p: "rdf:type", o: "req:REQ_0008", o_type: "fixed"},// SDC clause
            {s: "clauseId", p: "rdf:type", o: "owl:NamedIndividual"},
            {s: "clauseId", p: "rdfs:label", o: ""},
            {s: "clauseId", p: "owl:comment", o: "description"},

            {s: "clauseId", p: "req:REQ_0021", o: "equipmentId"},//scope
            {s: "equipmentId", p: "rdfs:label", o: "equipmentId"},
            {s: "equipmentId", p: "rdf:type", o: "owl:Class"},

            {s: "clauseId", p: "req:REQ_0020", o: "physicalQuantity"},//scope  if physicalQuantity
            {s: "physicalQuantity", p: "rdfs:label", o: "physicalQuantity" },
            {s: "physicalQuantity", p: "rdf:type", o: "part14:PhysicalQuantity"},
            {s: "physicalQuantity", p: "rdf:type", o: "owl:Class"},

            {s: "clauseId", p: "req:REQ_0020", o: "datatype"},//scope
            {s: "datatype", p: "rdfs:label", o: "datatype"},
            {s: "datatype", p: "rdf:type", o: "part14:Quality"},
            {s: "datatype", p: "rdf:type", o: "owl:Class"},

            {s: "clauseId", p: "req:REQ_0020", o: "pickList"},//scope
            {s: "pickList", p: "rdfs:label", o: "pickList"},
            {s: "pickList", p: "rdf:type", o: "http://w3id.org/readi/rdl/D101001535"},
            {s: "pickList", p: "rdf:type", o: "owl:Class"},


            /*    {s: "clauseId", p: " \"req:REQ_0021\"", o: "physicalQuantity"},// if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:PhysicalQuantity"},
                {s: "clauseId", p: "rdfs:label", o: "pickList"},// if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:Quality"},
                {s: "clauseId", p: "rdfs:label", o: "datataype"}, // if physicalQuantity
                {s: "clauseId", p: "rdf:type", o: "part14:Quality"},



                {s: "reqId", p: "_restriction", o: "clauseId", prop: "https://w3id.org/requirement-ontology/rdl/REQ_0018"},
                {s: "reqId", p: "rdf:type", o:"priority"},

                {s: "reqId", p: "req:REQ_0022", o: "http://data.total.com/resource/tsf/iso_14224/"},//posited by
                {s: "clauseId", p: "owl:comment", o: "description"},
                {s: "clauseId", p: "req:REQ_0021", o: "equipmentId"},//scope
                {s: "clauseId", p: "req:REQ_0020", o: "physicalQuantity"},//demand
                {s: "clauseId", p: "req:REQ_0020", o: "pickList"},//demand
                {s: "clauseId", p: "req:REQ_0020", o: "datataype"},//demand


                {s: "physicalQuantity", p: "rdfs:label", o: "physicalQuantity"},
                {s: "physicalQuantity", p: "rdf:type", o: "part14:PhysicalQuantity"},
                {s: "pickList", p: "rdfs:label", o: "pickList"},
                {s: "pickList", p: "rdf:type", o: "part14:Quality"},
                {s: "datataype", p: "rdfs:label", o: "datataype"},
                {s: "datataype", p: "rdf:type", o: "part14:Quality"},*/


        ],
    },


}


var mappingNames = ["SYSTEMS", "CLASSES_3", "CLASSES_4", "CLASSES_5", "CLASSES_6"];
//var mappingNames = ["CLASSES_5"];
//var mappingNames = ["CLASSES_4"];
//var mappingNames = ["CLASSES_3"]

var mappingNames = ["QUALITIES"]
var mappings = [];
mappingNames.forEach(function (mappingName) {
    mappings.push(mappingsMap[mappingName]);
});

var graphUri = "http://data.total.com/resource/tsf/iso_14224/requirements/";
var graphUri = "http://data.total.com/resource/tsf/iso_14224/";
//processor.getDescription("D:\\NLP\\ontologies\\14224\\RDL_Structure_14224_import.txt");
if (true) {
    if (mappings.length == 1)
        return processor.processSubClasses(mappings, graphUri);
    var triples = [
        {s: "<http://w3id.org/readi/z018-rdl/prod_SYS>", p: "rdfs:label", o: "'READI_SYTEMS'"},
        {s: "<http://w3id.org/readi/z018-rdl/prod_SYS>", p: "rdf:type", o: "owl:Class"},
        {
            s: "<http://w3id.org/readi/z018-rdl/prod_SYS>",
            p: "rdfs:subClassOf",
            o: "<http://standards.iso.org/iso/15926/part14/System>"
        },
        {s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>", p: "rdfs:label", o: "'READI_ARTEFACT'"},
        {s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>", p: "rdf:type", o: "owl:Class"},
        {
            s: "<http://w3id.org/readi/rdl/CFIHOS-30000311>",
            p: "rdfs:subClassOf",
            o: "<http://w3id.org/readi/rdl/D101001053>"
        },
        {
            s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
            p: "rdfs:label",
            o: "'PART_14_Functional_Object'"
        },
        {s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>", p: "rdf:type", o: "owl:Class"},
        {
            s: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>",
            p: "rdfs:subClassOf",
            o: "<http://standards.iso.org/iso/15926/part14/FunctionalObject>"
        }
    ]

    processor.clearGraph(graphUri, sparqlServerUrl, function (err, result) {
        if (err)
            return console.log(err);
        processor.writeTriples(triples, graphUri, sparqlServerUrl, function (err, result) {
            if (err)
                return console.log(err);
            processor.processSubClasses(mappings, graphUri);
        })
    })

}


if (false) {
    var mappingNames = ["CLASSES_4"];
    processor.processSubClasses(mappings, graphUri);
}

if (false) {
    var sourcePath = "D:\\NLP\\ontologies\\CFIHOS\\CFIHOS 1.5.xml";

    var jsonPath = sourcePath + ".json";

    UML2OWLparser.parseXMI(sourcePath, jsonPath, function () {
        UML2OWLparser.buildOwl(jsonPath, graphUri, function (err, result) {
            if (err) return console.lg(err);
            processor.processSubClasses(mappings, graphUri);
        });
    });
}
