import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import Shacl from "./shacl.js";

var SubGraph = (function () {
    var self = {};

    self.getSubGraphResources = function (sourceLabel, baseClassId, callback) {
        var distinctClasses = {};
        var allClasses = [];
        var allRestrictions = [];
        var fromStr = Sparql_common.getFromStr(sourceLabel);
        async.series(
            [
                function (callbackSeries) {
                    OntologyModels.registerSourcesModel(sourceLabel, null, function (err, result) {
                        callbackSeries(err);
                    });
                },
                ///getsubClasses
                function (callbackSeries) {
                    var treeData = OntologyModels.getClassHierarchyTreeData(sourceLabel, baseClassId, "descendants");
                    treeData.forEach(function (item) {
                        distinctClasses[item.id] = 1;
                        allClasses.push(item.id);
                    });

                    callbackSeries();
                },

                //get RestrictionsUri
                function (callbackSeries) {
                    var currentClasses = allClasses;
                    var currentRestrictions = [];
                    var nRestrictions = 1;

                    async.whilst(
                        function (callbackTest) {
                            return nRestrictions > 0;
                        },

                        function (callbackWhilst) {
                            var filter = Sparql_common.setFilter("s", currentClasses);
                            // var filter2 = 'filter (regex(str(?o),"_:b")) ';
                            var filter2 = " ?o rdf:type owl:Restriction.";
                            var query =
                                "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                "select  ?s ?p ?o " +
                                fromStr +
                                "  WHERE {\n" +
                                "  ?s ?p ?o. " + //?s rdfs:label ?sLabel " +
                                filter +
                                filter2 +
                                "} limit 10000";

                            self.query(sourceLabel, query, function (err, result) {
                                if (err) {
                                    return alert(err);
                                }
                                currentClasses = [];
                                result.results.bindings.forEach(function (item) {
                                    if (!distinctClasses[item.o.value]) {
                                        distinctClasses[item.o.value] = 1;
                                        allRestrictions.push(item.o.value);
                                        currentClasses.push(item.o.value);
                                        currentRestrictions.push(item.o.value);
                                    }
                                });

                                var filter = Sparql_common.setFilter("x", currentRestrictions);

                                var query =
                                    "PREFIX owl: <http://www.w3.org/2002/07/owl#>PREFIX" +
                                    " rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
                                    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
                                    "select  ?s " +
                                    fromStr +
                                    "  WHERE {\n" +
                                    "   ?x ?p ?s. ?s rdf:type owl:Class   " + //?s rdfs:label ?sLabel " +
                                    filter +
                                    "} limit 10000";

                                self.query(sourceLabel, query, function (err, result) {
                                    if (err) {
                                        return alert(err);
                                    }
                                    currentClasses = [];
                                    result.results.bindings.forEach(function (item) {
                                        if (!distinctClasses[item.s.value]) {
                                            distinctClasses[item.s.value] = 1;
                                            allClasses.push(item.s.value);
                                            currentClasses.push(item.s.value);
                                        }
                                    });

                                    nRestrictions = currentClasses.length;
                                    callbackWhilst();
                                });
                            });
                        },
                        function (err) {
                            callbackSeries();
                        }
                    );
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

    self.instantiateSubGraph = function (sourceLabel, classUri, callback) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.getSubGraphResources(sourceLabel, classUri, function (err, result) {
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

    self.getSubGraphShacl = function (sourceLabel, classUri, callback) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        Shacl.initSourceLabelPrefixes(sourceLabel);

        self.getSubGraphResources(sourceLabel, classUri, function (err, result) {
            var resources = result.classes.concat(result.restrictions);
            // return;

            self.getResourcesPredicates(sourceLabel, resources, "SELECT", {}, function (err, result) {
                var itemsMap = self.rawTriplesToNodesMap(result);
                var newTriples = [];
                // var prefix=Config.sources[sourceLabel].graphUri

                var allSahcls = "";
                for (var classUri in itemsMap) {
                    var item = itemsMap[classUri];
                    if (item.type == "Class") {
                        var shaclProperties = [];
                        if (item.restrictions) {
                            item.restrictions.forEach(function (retrictionUri) {
                                var restriction = itemsMap[retrictionUri];
                                if (!restriction.property || !restriction.range) {
                                    return;
                                }
                                var count = -1;
                                if (restriction.cardinality) {
                                    count = parseInt(restriction.cardinality.substring(1));
                                }

                                if (restriction.property.endsWith("Quality")) return;
                                var propStr = Shacl.uriToPrefixedUri(restriction.property);
                                var rangeStr = Shacl.uriToPrefixedUri(restriction.range);
                                var property = " sh:path " + propStr + " ;\n";
                                if (count > -1) property += "        sh:minCount " + count + " ;";
                                //  "        sh:maxCount " + count + " ;" +
                                property += "        sh:node " + rangeStr + " ;";

                                shaclProperties.push(property);
                            });

                            var domain = Shacl.uriToPrefixedUri(classUri);
                            var shaclStr = Shacl.getShacl(domain, null, shaclProperties);

                            if (allSahcls == "") allSahcls = Shacl.getPrefixes();
                            allSahcls += "\n" + shaclStr;
                        }
                    }
                }
                var payload = {
                    turtle: allSahcls,
                };
                const params = new URLSearchParams(payload);
                Axiom_editor.message("getting Class axioms");
                $.ajax({
                    type: "GET",
                    url: Config.apiUrl + "/rdf-io?" + params.toString(),
                    dataType: "json",

                    success: function (data, _textStatus, _jqXHR) {
                        if (data.result && data.result.indexOf("Error") > -1) {
                            return callback(data.result);
                        }
                        return callback(null, data.triples);
                        //  callback(null, data);
                    },
                    error(err) {
                        callback(err.responseText);
                    },
                });
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

    self.getSubGraphTurtles = function (sourceLabel, classUri) {
        if (!classUri) {
            classUri = "http://tsf/resources/ontology/DEXPIProcess_gfi_2/TransportingFluidsActivity";
        }

        self.instantiateSubGraph(sourceLabel, classUri, function (err, result) {});

        return;
        self.getSubGraphResources(sourceLabel, classUri, function (err, result) {
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
