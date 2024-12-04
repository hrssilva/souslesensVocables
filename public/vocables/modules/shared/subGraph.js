import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Shacl from "./shacl.js";

var SubGraph = (function () {
    var self = {};

    self.getSubGraphResources = function (sourceLabel, baseClassId, options, callback) {
        if (!options) {
            options = {};
        }
        var nClasses = 1;
        var allRestrictions = {};
        var allClasses = {};
        var uniqueRestrictions = {};

        var fromStr = Sparql_common.getFromStr(sourceLabel);

        var currentClasses = [baseClassId];

        async.series(
            [
                function (callbackSeries) {
                    async.whilst(
                        function (callbackTest) {
                            return nClasses > 0;
                        },

                        function (callbackWhilst) {
                            var filter = Sparql_common.setFilter("s", currentClasses, null, { values: true });

                            var query =
                                "PREFIX dexp: <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>\n" +
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT distinct *  FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>    FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/generic/>  WHERE {\n" +
                                "  ?s rdfs:subClassOf+ ?o. ?o rdf:type ?type " +
                                "";
                            filter +
                                "optional { ?o owl:onProperty ?property. ?o owl:someValuesFrom|owl:onClass ?targetClass  optional { ?o ?cardinalityType  ?cardinalityValue. filter (?cardinality in (owl:minCardinality,owl:maxCardinality,owl:cardinality))}}\n" +
                                "  } limit 10000";
                            self.query(sourceLabel, query, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                                currentClasses = [];
                                result.results.bindings.forEach(function (item) {
                                    if (!item.type) {
                                        return;
                                    }

                                    if (item.type.value.endsWith("Class")) {
                                        if (!allClasses[item.o.value]) {
                                            currentClasses.push(item.o.value);
                                            allClasses[item.o.value] = {};
                                        }
                                        if (!allClasses[item.s.value]) {
                                            currentClasses.push(item.s.value);
                                        }
                                        allClasses[item.s.value] = { superClass: item.o.value };
                                    } else if (item.type.value.endsWith("Restriction")) {
                                        if (!allRestrictions[item.s.value]) {
                                            allRestrictions[item.s.value] = {};
                                        }

                                        var obj = {
                                            property: item.property ? item.property.value : null,
                                            targetClass: item.targetClass ? item.targetClass.value : null,
                                            cardinalityType: item.cardinalityType ? item.cardinalityType.value : null,
                                            cardinalityValue: item.cardinalityValue ? item.cardinalityValue.value : null,
                                        };
                                        if (obj.targetClass.endsWith("Volume")) {
                                            var x = 1;
                                        }

                                        if (item.targetClass) {
                                            if (!allClasses[item.targetClass.value]) {
                                                allClasses[item.targetClass.value] = {};
                                                currentClasses.push(item.targetClass.value);
                                            }
                                        }

                                        if (!allRestrictions[item.s.value][obj.property]) {
                                            allRestrictions[item.s.value][obj.property] = [];
                                        }
                                        if (!uniqueRestrictions[obj.property + obj.targetClass + obj.cardinalityType]) {
                                            uniqueRestrictions[obj.property + obj.targetClass + obj.cardinalityType] = 1;
                                            allRestrictions[item.s.value][obj.property].push(obj);
                                        }
                                    }
                                });

                                nClasses = currentClasses.length;
                                callbackWhilst();
                            });
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
                },

                function (callbackSeries) {
                    var uris = Object.keys(allClasses).concat(Object.keys(allRestrictions));
                    var filter = Sparql_common.setFilter("s", uris);

                    var query =
                        "PREFIX dexp: <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>\n" +
                        "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>SELECT distinct *  FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/specific/>    FROM   <http://totalenergies/resources/tsf/ontology/dexpi-process/generic/>  WHERE {\n" +
                        "  ?s rdfs:label ?sLabel. " +
                        filter +
                        "} limit 10000";
                    self.query(sourceLabel, query, function (err, result) {
                        if (err) {
                            return alert(err);
                        }
                        result.results.bindings.forEach(function (item) {
                            if (allClasses[item.s.value]) {
                                allClasses[item.s.value].label = item.sLabel.value;
                            }
                        });
                        return callbackSeries();
                    });
                },
            ],
            function (err) {
                return callback(err, { classes: allClasses, restrictions: allRestrictions });
            }
        );
    };

    self.rawTriplesToNodesMap = function (rawTriples) {
        var nodesMap = {};
        rawTriples.forEach(function (item) {
            if (!nodesMap[item.s.value]) {
                nodesMap[item.s.value] = {};
            }

            if (item.p.value.endsWith("type")) {
                var o = Sparql_common.getLabelFromURI(item.o.value);
                nodesMap[item.s.value].type = o;
            }

            if (item.p.value.endsWith("label")) {
                nodesMap[item.s.value].label = item.o.value;
            }
            if (item.p.value.endsWith("onProperty")) {
                nodesMap[item.s.value].property = item.o.value;
            }
            if (item.p.value.endsWith("onClass")) {
                nodesMap[item.s.value].range = item.o.value;
            }
            if (item.p.value.endsWith("someValuesFrom")) {
                nodesMap[item.s.value].range = item.o.value;
            }
            if (item.p.value.endsWith("ardinality")) {
                var p = Sparql_common.getLabelFromURI(item.p.value);
                nodesMap[item.s.value][p] = item.o.value;
            }
            if (item.p.value.endsWith("subClassOf")) {
                if (item.o.value.indexOf("http") < 0) {
                    if (!nodesMap[item.s.value].restrictions) {
                        nodesMap[item.s.value].restrictions = [];
                    }
                    nodesMap[item.s.value].restrictions.push(item.o.value);
                }
            }
        });
        return nodesMap;
    };

    self.instantiateSubGraph = function (sourceLabel, classUri, options, callback) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.getSubGraphResources(sourceLabel, classUri, options, function (err, result) {
            var resources = result.classes.concat(result.restrictions);
            // return;
            self.getResourcesPredicates(sourceLabel, resources, "SELECT", {}, function (err, result) {
                var itemsMap = self.rawTriplesToNodesMap(result);
                var newTriples = [];
                // var prefix=Config.sources[sourceLabel].graphUri
                for (var classUri in itemsMap) {
                    var id = classUri; //+"/"+common.getRandomHexaId(5)
                    var item = itemsMap[classUri];
                    if (item.type == "Class") {
                        newTriples.push({
                            subject: id,
                            predicate: "rdf:type",
                            object: classUri,
                        });
                        newTriples.push({
                            subject: id,
                            predicate: "rdfs:label",
                            object: item.label,
                        });
                        if (item.restrictions) {
                            item.restrictions.forEach(function (restriction) {
                                var restriction = itemsMap[item.restriction];
                                if (restriction) {
                                    newTriples.push({
                                        subject: id,
                                        predicate: restriction.property,
                                        object: restriction.range,
                                    });
                                }
                            });
                        }
                    }
                }
                return callback(null, newTriples);
            });
        });
    };

    self.getSubGraphShaclTriples = function (sourceLabel, _classUri, options, callback) {
        if (!options) {
            options = {};
        }

        self.classUri = _classUri;
        if (!self.classUri) {
            self.classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        Shacl.initSourceLabelPrefixes(sourceLabel);

        self.getSubGraphResources(sourceLabel, self.classUri, options, function (err, result) {
            //  var resources = result.classes.concat(result.restrictions);
            var classesMap = result.classes;
            var restrictionsMap = result.restrictions;
            // return;

            var usedClasses = {};
            usedClasses[self.classUri] = 1;
            for (var classUri2 in restrictionsMap) {
                for (var property in restrictionsMap[classUri2]) {
                    restrictionsMap[classUri2][property].forEach(function (item) {
                        if (item.targetClass) {
                            usedClasses[item.targetClass] = 1;
                        }
                    });
                }
            }

            var allSahcls = "";
            for (var classUri2 in usedClasses) {
                var item = classesMap[classUri2];

                var classRestrictions = restrictionsMap[classUri2];
                var shaclProperties = [];
                if (classRestrictions) {
                    for (var property in classRestrictions) {
                        classRestrictions[property].forEach(function (restriction) {
                            if (!restriction.property || !restriction.targetClass) {
                                return;
                            }
                            var count = -1;
                            if (restriction.cardinalityValue) {
                                count = restriction.cardinalityValue;
                            }

                            var propStr = Shacl.uriToPrefixedUri(restriction.property);
                            var rangeStr = Shacl.uriToPrefixedUri(restriction.targetClass);
                            var property = " sh:path " + propStr + " ;\n";
                            if (count > -1) {
                                property += "        sh:minCount " + count + " ;";
                            }
                            //  "        sh:maxCount " + count + " ;" +
                            property += "        sh:node " + rangeStr + " ;";

                            shaclProperties.push(property);
                        });
                    }
                    var domain = Shacl.uriToPrefixedUri(classUri2);
                    var shaclStr = Shacl.getShacl(domain, null, shaclProperties);
                    allSahcls += shaclStr;
                }
            }

            var prefixes = Shacl.getPrefixes();
            allSahcls = prefixes + "\n" + allSahcls + ".";
            var payload = {
                turtle: allSahcls,
            };

            // transfom shacl to triples
            const params = new URLSearchParams(payload);
            $.ajax({
                type: "GET",
                url: Config.apiUrl + "/rdf-io?" + params.toString(),
                dataType: "json",

                success: function (data, _textStatus, _jqXHR) {
                    if (data.result && data.result.indexOf("Error") > -1) {
                        return callback(data.result);
                    }
                    return callback(null, { triples: data.triples, shacl: allSahcls, classesMap: classesMap });
                    //  callback(null, data);
                },
                error(err) {
                    callback(err.responseText);
                },
            });
        });
    };

    self.getResourcesPredicates = function (sourceLabel, resources, action, options, callback) {
        if (!options) {
            options = {};
        }
        var selectStr = "SELECT ?s ?p ?o ";
        if (action == "CONSTRUCT") {
            selectStr = "CONSTRUCT {?s ?p ?o} ";
        }

        var fromStr = Sparql_common.getFromStr(sourceLabel);
        var filter = Sparql_common.setFilter("s", resources);
        if (options.filter) {
            filter += options.filter;
        }
        var query =
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
            " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            selectStr +
            fromStr +
            " WHERE {\n" +
            "  ?s ?p ?o. " +
            filter +
            "} limit 10000";

        self.query(sourceLabel, query, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (action == "CONSTRUCT") {
                callback(null, result.result);
            } else {
                return callback(null, result.results.bindings);
            }
        });
    };

    self.query = function (sourceLabel, query, callback) {
        var url = Config._defaultSource.sparql_server.url;

        var prefixStr = "PREFIX " + Config.sources[sourceLabel].prefix + ": <" + Config.sources[sourceLabel].graphUri + ">\n";
        query = prefixStr + query;

        Sparql_proxy.querySPARQL_GET_proxy(
            url,
            query,
            "",
            {
                source: sourceLabel,
            },
            function (err, result) {
                if (err) {
                    return callback(err);
                }

                return callback(null, result);
            }
        );
    };

    self.getSubGraphTurtles = function (sourceLabel, options, classUri) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.instantiateSubGraph(sourceLabel, classUri, function (err, result) {});

        return;
        self.getSubGraphResources(sourceLabel, classUri, options, function (err, result) {
            var resources = result.classes.concat(result.restrictions);
            self.getResourcesPredicates(sourceLabel, resources, "SELECT", null, function (err, result) {
                console.log(result);
            });
        });
    };

    return self;
})();

export default SubGraph;
window.SubGraph = SubGraph;
