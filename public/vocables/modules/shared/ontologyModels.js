import Sparql_common from "../sparqlProxies/sparql_common.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import Sparql_proxy from "../sparqlProxies/sparql_proxy.js";
import Lineage_axioms_draw from "../tools/lineage/lineage_axioms_draw.js";
import Sparql_generic from "../sparqlProxies/sparql_generic.js";

// eslint-disable-next-line no-global-assign
var OntologyModels = (function () {
    self.registerSourcesModel = function (sources, callback) {
        MainController.UI.message("loading ontology models")
        if (!Array.isArray(sources)) {
            sources = [sources];
        }

        let url = Config.default_sparql_url + "?format=json&query=";

        var queryP = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" + "PREFIX owl: <http://www.w3.org/2002/07/owl#>";

        async.eachSeries(
            sources,
            function (source, callbackEach) {
                var graphUri;
                if (!Config.ontologiesVocabularyModels[source]) {
                    if (!Config.sources[source]) {
                        return MainController.UI.message("source " + source + " not allowed for user ");
                    }
                    graphUri = Config.sources[source].graphUri;
                    if (!graphUri) {
                        return callback();
                    }
                    Config.ontologiesVocabularyModels[source] = { graphUri: graphUri };
                }

                graphUri = Config.ontologiesVocabularyModels[source].graphUri;

                Config.ontologiesVocabularyModels[source].constraints = {}; //range and domain
                Config.ontologiesVocabularyModels[source].restrictions = {};
                Config.ontologiesVocabularyModels[source].classes = {};
                Config.ontologiesVocabularyModels[source].properties = [];

                var uniqueProperties = {};
                var propsWithoutDomain = [];
                var propsWithoutRange = [];
                var inversePropsMap = [];

                async.series(
                    [
                        function (callbackSeries) {
                            self.readModelOnServerCache(source, function (err, result) {
                                if (result) {
                                    Config.ontologiesVocabularyModels[source] = result;

                                    return callbackEach();
                                } else {
                                    callbackSeries();
                                }
                            });
                        },

                        // set properties
                        function (callbackSeries) {
                            var query =
                                queryP +
                                " SELECT distinct ?prop ?propLabel ?inverseProp ?superProperty from <" +
                                graphUri +
                                ">  WHERE {\n" +
                                "  ?prop ?p ?o " +
                                Sparql_common.getVariableLangLabel("prop", true, true) +
                                "optional{?prop owl:inverseOf ?inverseProp}" +
                                "optional{?prop rdfs:subPropertyOf ?superProperty}" +
                                " VALUES ?o {rdf:Property owl:ObjectProperty owl:OntologyProperty owl:AnnotationProperty} }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                result.results.bindings.forEach(function (item) {
                                    if (item.superProperty) {
                                        var x = 3;
                                    }
                                    if (!uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].properties.push({
                                            id: item.prop.value,
                                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                                            inverseProp: item.inverseProp ? item.inverseProp.value : null,
                                            superProp: item.superProperty ? item.superProperty.value : null,
                                        });
                                    }
                                    if (item.inverseProp) {
                                        inversePropsMap[item.prop.value] = item.inverseProp.value;

                                        inversePropsMap[item.inverseProp.value] = item.prop.value;
                                    }
                                });

                                callbackSeries();
                            });
                        },
                        // set model classes (if source not  declared in sources.json)
                        function (callbackSeries) {
                            if (!Config.basicVocabularies[source] && !Config.topLevelOntologies[source]) {
                                return callbackSeries();
                            }
                            var query =
                                queryP +
                                " select distinct ?sub ?subLabel FROM <" +
                                graphUri +
                                "> where{" +
                                " ?sub rdf:type ?class. " +
                                Sparql_common.getVariableLangLabel("sub", true, true) +
                                " VALUES ?class {owl:Class rdf:class rdfs:Class} filter( !isBlank(?sub))} order by ?sub";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].classes[item.sub.value]) {
                                        Config.ontologiesVocabularyModels[source].classes[item.sub.value] = {
                                            id: item.sub.value,
                                            label: item.subLabel ? item.subLabel.value : Sparql_common.getLabelFromURI(item.sub.value),
                                        };
                                    }
                                });
                                callbackSeries();
                            });
                        },

                        //set domain constraints
                        function (callbackSeries) {
                            var query =
                                queryP +
                                "" +
                                " select distinct ?prop ?domain FROM <" +
                                graphUri +
                                "> where{" +
                                " ?prop rdfs:domain ?domain." +
                                Sparql_common.getVariableLangLabel("domain", true, true) +
                                " }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    }
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domain = item.domain.value;
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].domainLabel = item.domainLabel
                                        ? item.domainLabel.value
                                        : Sparql_common.getLabelFromURI(item.domain.value);
                                });
                                callbackSeries();
                            });
                        },
                        //set range constraints
                        function (callbackSeries) {
                            var query =
                                queryP + " select distinct ?prop ?range FROM <" + graphUri + "> where{" + " ?prop rdfs:range ?range." + Sparql_common.getVariableLangLabel("range", true, true) + " }";
                            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                result.results.bindings.forEach(function (item) {
                                    if (!Config.ontologiesVocabularyModels[source].constraints[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].constraints[item.prop.value] = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                                    }
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].range = item.range.value;
                                    Config.ontologiesVocabularyModels[source].constraints[item.prop.value].rangeLabel = item.rangeLabel
                                        ? item.rangeLabel.value
                                        : Sparql_common.getLabelFromURI(item.range.value);
                                });
                                callbackSeries();
                            });
                        },

                        // set retrictions constraints
                        function (callbackSeries) {
                            // only relations  declared in sources.json
                            if (!Config.sources[source]) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getObjectRestrictions(source, null, { withoutBlankNodes: 1, withoutImports: 1 }, function (err, result) {
                                result.forEach(function (item) {
                                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);
                                    var domainLabel = item.subjectLabel ? item.subjectLabel.value : Sparql_common.getLabelFromURI(item.subject.value);
                                    var rangeLabel = item.valueLabel ? item.valueLabel.value : Sparql_common.getLabelFromURI(item.value.value);
                                    var propLabel = item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value);

                                    if (!uniqueProperties[item.prop.value]) {
                                        uniqueProperties[item.prop.value] = 1;
                                        Config.ontologiesVocabularyModels[source].properties.push({
                                            id: item.prop.value,
                                            label: propLabel,
                                        });
                                    }
                                    if (!Config.ontologiesVocabularyModels[source].restrictions[item.prop.value]) {
                                        Config.ontologiesVocabularyModels[source].restrictions[item.prop.value] = [];
                                    }
                                    Config.ontologiesVocabularyModels[source].restrictions[item.prop.value].push({
                                        domain: item.subject.value,
                                        range: item.value.value,
                                        domainLabel: domainLabel,
                                        rangeLabel: rangeLabel,
                                    });
                                });

                                callbackSeries();
                            });
                        },

                        //set inverse Props constraints
                        function (callbackSeries) {
                            self.setInversePropertiesConstaints(source, inversePropsMap);
                            callbackSeries();
                        },

                        //set inherited Constraints
                        function (callbackSeries) {
                            if (!Config.sources[source] || !Config.topLevelOntologies[source]) {
                                return callbackSeries();
                            }
                            var constraints = Config.ontologiesVocabularyModels[source].constraints;
                            Config.ontologiesVocabularyModels[source].properties.forEach(function (prop) {
                                if (!constraints[prop.id]) {
                                    propsWithoutDomain.push(prop.id);
                                    propsWithoutRange.push(prop.id);
                                } else {
                                    if (!constraints[prop.id].domain) {
                                        propsWithoutDomain.push(prop.id);
                                    }
                                    if (!constraints[prop.id].range) {
                                        propsWithoutRange.push(prop.id);
                                    }
                                }
                            });
                            callbackSeries();
                        },

                        //set inherited domains
                        function (callbackSeries) {
                            var props = propsWithoutDomain.concat(propsWithoutRange);
                            if (props.length == 0) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getPropertiesInheritedConstraints(source, props, { withoutImports: 0 }, function (err, propsMap) {
                                if (err) {
                                    return callbackSeries(err);
                                }

                                // for (var propId in Config.ontologiesVocabularyModels[source].properties) {
                                Config.ontologiesVocabularyModels[source].properties.forEach(function (prop) {
                                    var propId = prop.id;

                                    if (propId == "http://rds.posccaesar.org/ontology/lis14/rdl/activeParticipantIn") {
                                        var x = 3;
                                    }
                                    var inheritedConstaint = propsMap[propId];
                                    if (inheritedConstaint) {
                                        if (!Config.ontologiesVocabularyModels[source].constraints[propId]) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId] = { domain: "", range: "" };
                                        }

                                        // inheritance but no overload of constraint
                                        if (inheritedConstaint.domain && !Config.ontologiesVocabularyModels[source].constraints[propId].domain) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domain = inheritedConstaint.domain;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = inheritedConstaint.domainLabel;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].domainParentProperty = inheritedConstaint.parentProp;
                                        }

                                        if (inheritedConstaint.range && !Config.ontologiesVocabularyModels[source].constraints[propId].range) {
                                            Config.ontologiesVocabularyModels[source].constraints[propId].range = inheritedConstaint.range;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = inheritedConstaint.rangeLabel;
                                            Config.ontologiesVocabularyModels[source].constraints[propId].rangeParentProperty = inheritedConstaint.parentProp;
                                        }
                                    }
                                });

                                return callbackSeries();
                            });
                        },

                        // set constraints prop label and superProp
                        function (callbackSeries) {
                            Config.ontologiesVocabularyModels[source].properties.forEach(function (property) {
                                if (Config.ontologiesVocabularyModels[source].constraints[property.id]) {
                                    Config.ontologiesVocabularyModels[source].constraints[property.id].label = property.label;

                                    Config.ontologiesVocabularyModels[source].constraints[property.id].superProp = property.superProp;
                                }
                            });
                            return callbackSeries();
                        },

                        //set inverse Props constraints
                        function (callbackSeries) {
                            self.setInversePropertiesConstaints(source, inversePropsMap);
                            callbackSeries();
                        },

                        // set transSourceRangeAndDomainLabels
                        function (callbackSeries) {
                            if (!Config.sources[source]) {
                                return callbackSeries();
                            }
                            var classes = [];
                            for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                                var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                                if (constraint.domain && classes.indexOf(constraint.domain) < 0) {
                                    classes.push(constraint.domain);
                                }
                                if (constraint.range && classes.indexOf(constraint.range) < 0) {
                                    classes.push(constraint.range);
                                }
                            }
                            if (classes.length == 0) {
                                return callbackSeries();
                            }
                            Sparql_OWL.getLabelsMapFromLabelsGraph(classes, function (err, labelsMap) {
                                if (err) {
                                    return callbackSeries(err);
                                }
                                for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
                                    var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
                                    if (labelsMap[constraint.domain]) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = labelsMap[constraint.domain];
                                    }
                                    if (labelsMap[constraint.range]) {
                                        Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = labelsMap[constraint.range];
                                    }
                                }

                                return callbackSeries();
                            });

                            /*
var filter = Sparql_common.setFilter("id", classes);
Sparql_OWL.getDictionary(source, { lang: Config.default_lang, filter: filter }, null, function (err, result) {
  if (err) {
    return callbackSeries(err);
  }
  var labelsMap = {};
  result.forEach(function (item) {
    if (item.label) {
      labelsMap[item.id.value] = item.label.value;
    } else {
      labelsMap[item.id.value] = Sparql_common.getLabelFromURI(item.id.value);
    }
  });
  for (var propId in Config.ontologiesVocabularyModels[source].constraints) {
    var constraint = Config.ontologiesVocabularyModels[source].constraints[propId];
    if (labelsMap[constraint.domain]) {
      Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = labelsMap[constraint.domain];
    }
    if (labelsMap[constraint.range]) {
      Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = labelsMap[constraint.range];
    }
  }

  return callbackSeries();
});*/
                        },

                        //register source in Config.sources
                        function (callbackSeries) {
                            if (!Config.sources[source]) {
                                Config.sources[source] = { graphUri: graphUri, controllerName: Sparql_OWL, controller: Sparql_OWL, sparql_server: { url: Config.default_sparql_url } };
                            }
                            return callbackSeries();
                        },
                        function (callbackSeries) {
                            if (true || Config.basicVocabularies[source]) {
                                self.writeModelOnServerCache(source, Config.ontologiesVocabularyModels[source], function (err, result) {
                                    if (err) console.log(err);
                                    return callbackSeries();
                                });
                            }
                        },
                    ],
                    function (err) {
                        callbackEach(err);
                    }
                );
            },
            function (err) {
                MainController.UI.message("",true)
                if (callback) {
                    return callback(err);
                }
            }
        );
    };

    self.setInversePropertiesConstaints = function (source, inversePropsMap) {
        for (var propId in inversePropsMap) {
            var propConstraints = Config.ontologiesVocabularyModels[source].constraints[propId];
            var inversePropConstraints = Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]];
            if (!propConstraints) {
                propConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                Config.ontologiesVocabularyModels[source].constraints[propId] = propConstraints;
            }
            if (!inversePropConstraints) {
                inversePropConstraints = { domain: "", range: "", domainLabel: "", rangeLabel: "" };
                Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]] = inversePropConstraints;
            }

            if (propConstraints.domain && !inversePropConstraints.range) {
                Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].range = propConstraints.domain;
                Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].rangeLabel = propConstraints.domainLabel;
            }
            if (propConstraints.range && !inversePropConstraints.domain) {
                Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domain = propConstraints.range;
                Config.ontologiesVocabularyModels[source].constraints[inversePropsMap[propId]].domainLabel = propConstraints.rangeLabel;
            }

            if (inversePropConstraints.domain && !propConstraints.range) {
                Config.ontologiesVocabularyModels[source].constraints[propId].range = inversePropConstraints.domain;
                Config.ontologiesVocabularyModels[source].constraints[propId].rangeLabel = inversePropConstraints.domainLabel;
            }
            if (inversePropConstraints.range && !propConstraints.domain) {
                Config.ontologiesVocabularyModels[source].constraints[propId].domain = inversePropConstraints.range;
                Config.ontologiesVocabularyModels[source].constraints[propId].domainLabel = inversePropConstraints.rangeLabel;
            }
        }
    };

    self.unRegisterSourceModel = function () {
        var basicsSources = Object.keys(Config.basicVocabularies);
        for (var source in Config.ontologiesVocabularyModels) {
            if (basicsSources.indexOf(source) < 0) {
                delete Config.ontologiesVocabularyModels[source];
            }
        }
    };

    self.readModelOnServerCache = function (source, callback) {
        const params = new URLSearchParams({
            source: source,
        });

        var x = params.toString();
        $.ajax({
            type: "GET",
            url: Config.apiUrl + "/ontologyModels?" + params.toString(),
            dataType: "json",

            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };
    self.writeModelOnServerCache = function (source, model, callback) {
        var payload = {
            source: source,
            model: model,
        };

        $.ajax({
            type: "POST",
            url: `${Config.apiUrl}/ontologyModels`,
            data: payload,
            success: function (data, _textStatus, _jqXHR) {
                return callback(null, data);
            },
            error: function (err) {
                return callback(err);
            },
        });
    };

    self.getAllowedPropertiesBetweenNodes = function (source, startNodeId, endNodeId, callback) {
        var startNodeAncestors = [];
        var endNodeAncestors = [];

        var validProperties = [];
        var validConstraints = {};
        var allConstraints = {};
        var hierarchies = {};

        var noConstaintsArray = [];
        var propertiesMatchingBoth = [];
        var propertiesMatchingStartNode = [];
        var propertiesMatchingEndNode = [];
        var filter = "filter (?superClass not in (<http://purl.obolibrary.org/obo/BFO_0000001>,<http://purl.obolibrary.org/obo/BFO_0000002>,<http://purl.obolibrary.org/obo/BFO_0000003>))";
        var duplicateProps = [];

        var validConstraints = {};
        var startNodeAncestorIds = [];
        var endNodeAncestorIds = [];

        async.series(
            [
                function (callbackSeries) {
                    Sparql_OWL.getNodesAncestors(source, [startNodeId], { excludeItself: 0, filter: filter }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        hierarchies = result.hierarchies;
                        callbackSeries();
                    });
                },
                function (callbackSeries) {
                    if (!endNodeId) {
                        return callbackSeries();
                    }
                    Sparql_OWL.getNodesAncestors(source, [endNodeId], { excludeItself: 0, filter: filter }, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        var hierarchiesEnd = result.hierarchies;
                        for (var key in hierarchiesEnd) {
                            hierarchies[key] = hierarchiesEnd[key];
                        }

                        callbackSeries();
                    });
                }, //get matching properties
                function (callbackSeries) {
                    var allSources = [source];
                    if (Config.sources[source].imports) {
                        allSources = allSources.concat(Config.sources[source].imports);
                    }

                    var allDomains = {};
                    var allRanges = {};

                    hierarchies[startNodeId].forEach(function (item) {
                        startNodeAncestorIds.push(item.superClass.value);
                    });

                    if (endNodeId) {
                        hierarchies[endNodeId].forEach(function (item, startNodeIndex) {
                            endNodeAncestorIds.push(item.superClass.value);
                        });
                    }

                    allSources.forEach(function (_source) {
                        var sourceConstraints = Config.ontologiesVocabularyModels[_source].constraints;
                        for (var property in sourceConstraints) {
                            var constraint = sourceConstraints[property];
                            constraint.source = _source;
                            var domainOK = false;
                            if (!allConstraints[property]) {
                                allConstraints[property] = constraint;

                                if (constraint.domain) {
                                    if (startNodeAncestorIds.indexOf(constraint.domain) > -1) {
                                        if (!constraint.range || !endNodeId) {
                                            propertiesMatchingStartNode.push(property);
                                        } else {
                                            domainOK = true;
                                        }
                                    }
                                }
                                if (constraint.range) {
                                    if (endNodeAncestorIds.indexOf(constraint.range) > -1) {
                                        if (domainOK) {
                                            propertiesMatchingBoth.push(property);
                                        } else {
                                            if (!constraint.domain) {
                                                propertiesMatchingEndNode.push(property);
                                            }
                                        }
                                    }
                                }
                                if (!constraint.domain && !constraint.range) {
                                    noConstaintsArray.push(property);
                                }
                            } else if (allConstraints[property].domain != constraint.domain && allConstraints[property].range != constraint.range) {
                                duplicateProps.push(property + "_" + allConstraints[property].source + "-----" + constraint.source);
                            }
                        }
                    });

                    callbackSeries();
                },

                //remove matching superproperties
                function (callbackSeries) {
                    var propsToRemove = [];

                    function recurse(propId) {
                        if (allConstraints[propId]) {
                            var superProp = allConstraints[propId].superProp;
                            if (superProp) {
                                if (validProperties.indexOf(superProp) > -1) {
                                    if (propsToRemove.indexOf(superProp) < 0) {
                                        propsToRemove.push(superProp);
                                    }
                                }
                                recurse(superProp);
                            }
                        }
                    }

                    propertiesMatchingBoth.forEach(function (propId) {
                        recurse(propId);
                    });
                    propertiesMatchingStartNode.forEach(function (propId) {
                        recurse(propId);
                    });
                    propertiesMatchingEndNode.forEach(function (propId) {
                        recurse(propId);
                    });

                    /*   validProperties = propertiesMatchingBoth;
validProperties = common.array.union(validProperties, propertiesMatchingStartNode);
validProperties = common.array.union(validProperties, propertiesMatchingEndNode);
validProperties = common.array.union(validProperties, noConstaintsArray);*/

                    validConstraints = { both: {}, domain: {}, range: {}, noConstraints: {} };

                    propertiesMatchingBoth.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["both"][propId] = allConstraints[propId];
                        }
                    });
                    propertiesMatchingStartNode.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["domain"][propId] = allConstraints[propId];
                        }
                    });

                    propertiesMatchingEndNode.forEach(function (propId) {
                        if (propsToRemove.indexOf(propId) < 0) {
                            validConstraints["range"][propId] = allConstraints[propId];
                        }
                    });
                    noConstaintsArray.forEach(function (propId) {
                        validConstraints["noConstraints"][propId] = allConstraints[propId];
                    });
                    callbackSeries();
                },
            ],
            function (err) {
                if (duplicateProps.length > 0) {
                    MainController.UI.message(duplicateProps.length + " DUPLICATE PROPERTIES WITH DIFFERENT RANGE OR DOMAIN");
                }
                console.warn("DUPLICATE PROPERTIES WITH DIFFERENT RANGE OR DOMAIN\r");
                duplicateProps.forEach(function (item) {
                    console.warn(item);
                });
                return callback(err, { constraints: validConstraints, nodes: { startNode: startNodeAncestorIds, endNode: endNodeAncestorIds } });
            }
        );
    };

    self.getInferredModel = function (source, options, callback) {
        if (!Config.ontologiesVocabularyModels[source]) {
            Config.ontologiesVocabularyModels[source];
        }
        if (false && Config.ontologiesVocabularyModels[source].inferredClassModel) {
            return callback(null, Config.ontologiesVocabularyModels[source].inferredClassModel);
        } else {
            var sourceGraphUri = Config.sources[source].graphUri;
            var sourceGraphUriFrom = Sparql_common.getFromStr(source, true, true);
            var importGraphUriFrom = Sparql_common.getFromStr(source, true, false);

            var query =
                "PREFIX owl: <http://www.w3.org/2002/07/owl#>\n" +
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
                "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
                "    SELECT   distinct  ?prop ?sClass  ?oClass ?propLabel ?sClassLabel ?oClassLabel \n" +
                sourceGraphUriFrom +
                " " +
                importGraphUriFrom +
                "  \n" +
                " WHERE {" +
                "   graph ?g3 {\n" +
                "      ?sparent rdf:type ?stype filter (?stype in (owl:Class))\n" +
                "    optional { ?sparent rdfs:subClassOf ?sparentClass filter (!isBlank(?sparentClass))}\n" +
                "    bind (if(bound(?sparentClass) && ?g3=<" +
                sourceGraphUri +
                ">,?sparentClass,?sparent) as ?sClass)  optional{?sClass rdfs:label ?sClassLabel}\n" +
                "    \n" +
                "    \n" +
                "       ?oparent rdf:type ?otype filter (?otype in (owl:Class))\n" +
                "    optional { ?oparent rdfs:subClassOf ?oparentClass filter (!isBlank(?oparentClass))}\n" +
                "    bind (if(bound(?oparentClass) && ?g3=<" +
                sourceGraphUri +
                ">,?oparentClass,?oparent) as ?oClass)  optional{?oClass rdfs:label ?oClassLabel}\n" +
                "    \n" +
                "  }\n" +
                "  \n" +
                "  \n" +
                "      graph ?g2{\n" +
                "    ?sparent rdf:type ?stype filter (?stype in (owl:Class))\n" +
                "    \n" +
                "  }\n" +
                "  graph ?g3{\n" +
                "      ?oparent rdf:type ?otype filter (?otype in (owl:Class))\n" +
                "  }\n" +
                "   graph <" +
                sourceGraphUri +
                ">  {\n" +
                "    ?s ?prop ?o.\n" +
                "     ?s rdf:type+ ?sparent.  \n" +
                "       ?o rdf:type+ ?oparent.  \n" +
                "  }\n" +
                "    graph  ?g{\n" +
                "     \n" +
                "        ?prop  rdf:type  owl:ObjectProperty. optional{?prop rdfs:label ?propLabel} }\n" +
                "  } LIMIT 10000";

            let url = Config.default_sparql_url + "?format=json&query=";
            Sparql_proxy.querySPARQL_GET_proxy(url, query, null, {}, function (err, result) {
                if (err) {
                    return callback(err);
                }
                result.results.bindings = Sparql_generic.setBindingsOptionalProperties(result.results.bindings, ["prop", "sClass", "oClass"], { source: source });

                Config.ontologiesVocabularyModels[source].inferredClassModel = result.results.bindings;
                return callback(null, result.results.bindings);
            });
        }
    };

    return self;
})();

export default OntologyModels;

window.OntologyModels = OntologyModels;
