// eslint-disable-next-line @typescript-eslint/no-unused-vars
// !!!!!!!!  const util = require("../../../../../bin/util.");
var Lineage_blend = (function () {
    var self = {};
    self.authorizedProperties = {};
    self.currentSource=null






    self.graphModification = {
        showAddNodeGraphDialog: function () {
            self.graphModification.creatingNodeTriples = [];
            self.graphModification.creatingsourceUri = null;
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").load("snippets/lineage/lineageAddNodeDialog.html", function () {
                self.getSourcePossiblePredicatesAndObject(Lineage_sources.activeSource, function (err, result) {
                    if (err) return alert(err.responseText);
                    if (!Config.sources[Lineage_sources.activeSource].allowIndividuals) {
                        $("#LineageBlend_creatingNamedIndividualButton").css("display", "none");
                    }
                    self.currentPossibleClassesAndPredicates = result;
                    var allObjects = result.usualObjects.concat(result.TopLevelOntologyObjects).concat([""]).concat(result.sourceObjects);

                    common.fillSelectOptions("KGcreator_predicateSelect", result.predicates, true, "label", "id");
                    common.fillSelectOptions("KGcreator_objectSelect", allObjects, true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodePredicatesSelect", result.predicates, true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodeObjectsSelect", allObjects, true, "label", "id");
                    common.fillSelectOptions("LineageBlend_creatingNodeObjects2Select", allObjects, true, "label", "id");
                });
                self.possibleNamedIndividuals = {};
            });
        },

        getPossibleNamedIndividuals: function (callback) {
            Sparql_OWL.getNamedIndividuals(Lineage_sources.activeSource, null, null, function (err, result) {
                if (err) return callback(err);
                var individuals = {};
                result.forEach(function (item) {
                    individuals[item.conceptLabel.value] = item.concept.value;
                });
                return callback(null, individuals);
            });
        },

        showCreatingNodeClassOrNamedIndividualDialog: function (type) {
            self.graphModification.currentCreatingNodeType = type;
            var showClassDiv = type == "Class";
            if (showClassDiv) {
                $("#LineageBlend_creatingNodeClassDiv").css("display", "block");
                $("#LineageBlend_creatingNodeNameIndividualDiv").css("display", "none");
            } else {
                $("#LineageBlend_creatingNodeClassDiv").css("display", "none");
                $("#LineageBlend_creatingNodeNameIndividualDiv").css("display", "block");
            }

            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            $("#LineageBlend_creatingNodeClassParamsDiv").tabs({});
            if (type == "NamedIndividual") {
                self.graphModification.getPossibleNamedIndividuals(function (err, result) {
                    if (err) return alert(err.responseText);
                    self.possibleNamedIndividuals = result;

                    // add existing individuals as possible type object
                    var existingIndividuals = [];
                    for (var key in self.possibleNamedIndividuals) {
                        existingIndividuals.push({
                            id: self.possibleNamedIndividuals[key],
                            label: "i_" + key,
                            type: "NamedIndividual",
                        });
                    }
                    existingIndividuals.sort(function (a, b) {
                        if (a.label > b.label) return 1;
                        if (a.labe < b.label) return -1;
                        return 0;
                    });
                    var sourceObjects = self.currentPossibleClassesAndPredicates.sourceObjects.concat(existingIndividuals);
                    common.fillSelectOptions("LineageBlend_creatingNodeObjects2Select", sourceObjects, true, "label", "id");
                    if (Lineage_classes.currentGraphNode && Lineage_classes.currentGraphNode.data) {
                        setTimeout(function () {
                            $("#LineageBlend_creatingNodeObjects2Select").val(Lineage_classes.currentGraphNode.data.id);
                        }, 200);
                    }
                });
            } else {
                if (Lineage_classes.currentGraphNode && Lineage_classes.currentGraphNode.data) {
                    $("#LineageBlend_creatingNodeObjectsSelect").val(Lineage_classes.currentGraphNode.data.id);
                }
            }
        },

        openCreatNodeDialogOpen: function (type) {
            if (type == "owl:Class") {
                $("#LineageBlend_creatingNodeClassParamsDiv").dialog("open");
            }
        },
        getURI: function (label) {
            var uri = null;
            var uriType = $("#LineageBlend_creatingNodeUriType").val();
            var specificUri = $("#LineageBlend_creatingNodeSubjectUri").val();
            if (specificUri) uriType = "specific";

            let graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
            if (uriType == "fromLabel") uri = graphUri + common.formatStringForTriple(label, true);
            else if (uriType == "randomHexaNumber") uri = graphUri + common.getRandomHexaId(10);
            else if (uriType == "specific") {
                if (specificUri) {
                    uri = specificUri;
                } else {
                }

                // self.graphModification.creatingNodeTriples = [];
            }
            return uri;
        },
        addTripleToCreatingNode: function (predicate, object) {
            if (!self.graphModification.creatingsourceUri) {
                var uri = self.graphModification.getURI(object);
                self.graphModification.creatingsourceUri = uri;
            }
            if (!predicate) predicate = $("#KGcreator_predicateInput").val();
            if (!object) object = $("#KGcreator_objectInput").val();

            $("#KGcreator_predicateInput").val("");
            $("#KGcreator_objectInput").val("");
            $("#KGcreator_predicateSelect").val("");
            $("#KGcreator_objectSelect").val("");

            if (!predicate) return alert("no value for predicate");
            if (!object) return alert("no value for object");

            var triple = {
                subject: self.graphModification.creatingsourceUri,
                predicate: predicate,
                object: object,
            };
            var num = self.graphModification.creatingNodeTriples.length;
            self.graphModification.creatingNodeTriples.push(triple);
            $("#LineageBlend_creatingNodeTiplesDiv").append(
              "<div id='triple_" +
              num +
              "' class='blendCreateNode_triplesDiv' >" +
              "new Node" +
              "&nbsp;&nbsp;<b>" +
              triple.predicate +
              "" +
              " </b>&nbsp;&nbsp;   " +
              triple.object +
              "&nbsp;<button  style='font-size: 8px;' onclick='Lineage_blend.graphModification.removeTriple(" +
              num +
              ")'>X</button></div>"
            );
        },

        addClassOrIndividualTriples: function () {
            $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");

            var label = $("#LineageBlend_creatingNodeNewClassLabel").val();
            if (!label) return alert("rdfs:label is mandatory");
            self.graphModification.addTripleToCreatingNode("rdfs:label", label);

            var type = $("#LineageBlend_creatingNodePredicatesSelect").val();

            if (self.graphModification.currentCreatingNodeType == "Class") {
                var superClass = $("#LineageBlend_creatingNodeObjectsSelect").val();
                if (!superClass) return alert("owl:Class is mandatory");
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:Class");
                self.graphModification.addTripleToCreatingNode("rdfs:subClassOf", superClass);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                var individualtypeClass = $("#LineageBlend_creatingNodeObjects2Select").val();
                if (!individualtypeClass) return alert("owl:Class is mandatory");
                self.graphModification.addTripleToCreatingNode("rdf:type", "owl:NamedIndividual");
                self.graphModification.addTripleToCreatingNode("rdf:type", individualtypeClass);
            }
            var origin = "Lineage_addNode";
            var status = "draft";
            var metaDataTriples = self.getCommonMetaDataTriples(self.graphModification.creatingsourceUri, origin, status, null);
            metaDataTriples.forEach(function (triple) {
                self.graphModification.addTripleToCreatingNode(triple.predicate, triple.object);
            });
        },

        addClassesOrIndividualsTriples: function () {
            var str = $("#LineageBlend_creatingNode_nodeListTA").val();
            if (!str) return alert("no tbale data to process");
            var lines = str.trim().split("\n");

            var possibleClasses = self.currentPossibleClassesAndPredicates.TopLevelOntologyObjects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            if (self.graphModification.currentCreatingNodeType == "Class") {
                possibleClasses = self.currentPossibleClassesAndPredicates.TopLevelOntologyObjects.concat(self.currentPossibleClassesAndPredicates.sourceObjects);
            } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                possibleClasses = self.currentPossibleClassesAndPredicates.sourceObjects;
            }

            var targetUrisMap = {};
            possibleClasses.forEach(function (obj) {
                var classLabel = obj.label;
                /* var array = classLabel.split(/[:\/\#]/);
   if (array.length > 0) classLabel = array[array.length - 1];*/
                targetUrisMap[classLabel] = obj.id;
            });

            var wrongClasses = [];
            var triples = [];
            let graphUri = Config.sources[Lineage_sources.activeSource].graphUri;
            let sourceUrisMap = {};
            var sourceUrisArray = [];
            var sep = null;

            lines.forEach(function (line, indexLine) {
                line = line.trim();
                if (indexLine == 0) {
                    var separators = ["\t", ";", ","];
                    separators.forEach(function (_sep) {
                        if (line.split(_sep).length != 2 || sep) return;
                        sep = _sep;
                    });
                }

                var cells = line.split(sep);

                if (cells.length != 2) return;
                var label = cells[0];
                var classLabel = cells[1];

                if (targetUrisMap[label]) {
                    sourceUrisMap[label] = targetUrisMap[label];
                } else {
                    var sourceUri = self.graphModification.getURI(label);
                    sourceUrisMap[label] = sourceUri;
                    sourceUrisArray.push(sourceUri);
                }
            });

            if (!sep) return alert("no correct separator found : [\t,;]");

            lines.forEach(function (line, indexLine) {
                line = line.trim();
                var cells = line.split(sep);
                var label = cells[0];
                var classLabel = cells[1];
                var sourceUri = sourceUrisMap[label];
                var targetUri = targetUrisMap[classLabel];
                var predicate = "rdf:type";
                if (self.graphModification.currentCreatingNodeType == "NamedIndividual" && !targetUri) {
                    targetUri = self.possibleNamedIndividuals[classLabel];
                }

                if (!targetUri) {
                    //  alert("xxxx");
                    //targetUri  declared in the list as source node
                    predicate = "part14:partOf";
                    targetUri = sourceUrisMap[classLabel];
                }
                if (!targetUri) {
                    wrongClasses.push({ line: indexLine, classLabel: classLabel });
                } else {
                    triples.push({ subject: sourceUri, predicate: "rdfs:label", object: label });
                    self.possibleNamedIndividuals[label] = sourceUri;
                    if (self.graphModification.currentCreatingNodeType == "Class") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:Class" });
                        triples.push({ subject: sourceUri, predicate: "rdfs:subClassOf", object: targetUri });
                    } else if (self.graphModification.currentCreatingNodeType == "NamedIndividual") {
                        triples.push({ subject: sourceUri, predicate: "rdf:type", object: "owl:NamedIndividual" });
                        if (targetUri.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > 0) {
                            triples.push({ subject: sourceUri, predicate: predicate, object: targetUri });
                        } else {
                            triples.push({ subject: sourceUri, predicate: predicate, object: targetUri });
                        }
                    }
                }
            });

            if (wrongClasses.length > 0) {
                var html = "<b>wrong lines</b><br><ul>";
                wrongClasses.forEach(function (item) {
                    html += "<li>line " + item.line + " unrecognized classLabel " + item.classLabel + "</li>";
                });
                $("#LineageBlend_creatingNodeListJournalDiv").html(html);
                $("#LineageBlend_creatingNodeClassParamsDiv").tabs("option", "active", 2);
            } else {
                if (confirm("create " + lines.length + " nodes")) {
                    Sparql_generic.insertTriples(Lineage_sources.activeSource, triples, {}, function (err, _result) {
                        if (err) return alert(err);
                        self.graphModification.creatingNodeTriples = [];
                        MainController.UI.message(sourceUrisArray.length + " triples created, indexing...");

                        SearchUtil.generateElasticIndex(Lineage_sources.activeSource, { ids: sourceUrisArray }, function (err, result) {
                            if (err) return alert(err.responseText);
                            if (self.graphModification.currentCreatingNodeType == "Class") {
                                Lineage_classes.addNodesAndParentsToGraph(Lineage_sources.activeSource, sourceUrisArray, {}, function (err) {
                                    $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");
                                    $("#LineagePopup").dialog("close");
                                    MainController.UI.message(sourceUrisArray.length + "nodes Created and Indexed");
                                });
                            } else {
                                $("#LineageBlend_creatingNodeClassParamsDiv").dialog("close");
                                $("#LineagePopup").dialog("close");
                                MainController.UI.message(sourceUrisArray.length + "nodes Created and Indexed");
                            }
                        });
                    });
                }
            }
        },

        removeTriple: function (index) {
            self.graphModification.creatingNodeTriples.splice(index, 1);
            $("#triple_" + index).remove();
        },

        createNode: function () {
            if (!self.graphModification.creatingNodeTriples) return alert("no predicates for node");
            var str = JSON.stringify(self.graphModification.creatingNodeTriples);

            if (str.indexOf("rdf:type") < 0) return alert("a type must be declared");
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:subClassOf") < 0) return alert("a class must be a rdfs:subClassOf anotherClass");
            if (str.indexOf("owl:Class") > -1 && str.indexOf("rdfs:label") < 0) return alert("a class must have a rdfs:label");
            if (true || confirm("create node")) {
                Sparql_generic.insertTriples(Lineage_sources.activeSource, self.graphModification.creatingNodeTriples, {}, function (err, _result) {
                    if (err) return alert(err);
                    $("#LineagePopup").dialog("close");
                    var nodeData = {
                        id: self.graphModification.creatingsourceUri,
                        source: Lineage_sources.activeSource,
                    };
                    MainController.UI.message("node Created");
                    self.graphModification.creatingNodeTriples = [];
                    Lineage_classes.drawNodeAndParents(nodeData);
                    SearchUtil.generateElasticIndex(Lineage_sources.activeSource, { ids: [self.graphModification.creatingsourceUri] }, function (err, result) {
                        if (err) return alert(err.responseText);
                        MainController.UI.message("node Created and Indexed");
                    });
                });
            }
        },
        showAddEdgeFromGraphDialog: function (edgeData, callback) {
            $("#LineagePopup").dialog("open");
            $("#LineagePopup").load("snippets/lineage/lineageAddEdgeDialog.html", function () {
                self.sourceNode = visjsGraph.data.nodes.get(edgeData.from).data;
                self.targetNode = visjsGraph.data.nodes.get(edgeData.to).data;

                let options = {
                    openAll: true,
                    selectTreeNodeFn: function (event, obj) {
                        event.stopPropagation();
                        self.currentPropertiesTreeNode = obj.node;
                        if (obj.event.which == 3) return;
                        //dispatch of sources to write in depending on relation type and editable
                        var inSource;
                        var options = {};
                        if (obj.node.data.id == "http://www.w3.org/2002/07/owl#sameAs")
                          // le sameAs sont tous dans le dictionaire
                            inSource = Config.dictionarySource;
                        else {
                            var mainSource = Config.sources[Lineage_sources.activeSource];
                            if (Config.sources[self.sourceNode.source].editable) {
                                inSource = self.sourceNode.source;
                            } else if (mainSource.editable) {
                                inSource = Lineage_sources.activeSource;
                            }
                            //soit  dans predicateSource
                            else inSource = Config.predicatesSource;
                        }

                        Lineage_blend.graphModification.createRelationFromGraph(inSource, self.sourceNode, self.targetNode, obj.node.data.id, options, function (err, blankNodeId) {
                            if (err) return callback(err);
                            let newEdge = edgeData;
                            let propLabel = obj.node.data.label || Sparql_common.getLabelFromURI(obj.node.data.id);
                            var bNodeId = blankNodeId || "<_:b" + common.getRandomHexaId(10) + ">";
                            newEdge.label = "<i>" + propLabel + "</i>";
                            (newEdge.font = { multi: true, size: 10 }),
                              (newEdge.arrows = {
                                  to: {
                                      enabled: true,
                                      type: Lineage_classes.defaultEdgeArrowType,
                                      scaleFactor: 0.5,
                                  },
                              });
                            newEdge.dashes = true;
                            newEdge.color = Lineage_classes.restrictionColor;
                            newEdge.data = {
                                source: inSource,
                                bNodeId: bNodeId,
                                propertyLabel: propLabel,
                                propertyId: obj.node.data.id,
                            };
                            visjsGraph.data.edges.add([newEdge]);
                        });
                    },
                };
                var jstreeData = [];
                var distinctProps = {};
                var authorizedProps = {};
                let inSource = Lineage_sources.activeSource;
                let sourceNodeFirsttopLevelOntologyAncestor = null;
                let targetNodeFirsttopLevelOntologyAncestor = null;
                async.series(
                  [
                      function (callbackSeries) {
                          jstreeData.push({
                              id: "http://www.w3.org/2002/07/owl#sameAs",
                              text: "owl:sameAs",
                              parent: "#",
                              data: {
                                  id: "http://www.w3.org/2002/07/owl#sameAs",
                                  inSource: Config.dictionarySource,
                              },
                          });

                          jstreeData.push({
                              id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                              text: "rdf:type",
                              parent: "#",
                              data: {
                                  id: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                                  inSource: Lineage_sources.activeSource,
                              },
                          });

                          if (Config.sources[Lineage_sources.activeSource].schemaType == "OWL" && self.sourceNode.type != "NamedIndividual") {
                              jstreeData.push({
                                  id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                  text: "rdfs:subClassOf",
                                  parent: "#",
                                  data: {
                                      id: "http://www.w3.org/2000/01/rdf-schema#subClassOf",
                                      inSource: Lineage_sources.activeSource,
                                  },
                              });
                          }

                          callbackSeries();
                      },

                      //filter formal ontology axioms to selected nodes
                      function (callbackSeries) {
                          if (!Config.sources[Lineage_sources.activeSource].editable) {
                              $("#lineageAddEdgeDialog_TopLevelOntologyPropertiesTreeDiv").html("source " + Lineage_sources.activeSource + " is not editable");
                              return callbackSeries();
                          }
                          let inSource = Config.currentTopLevelOntology;
                          let ancestorsDepth = 10;
                          Sparql_OWL.getNodesAncestors(Lineage_sources.activeSource, [self.sourceNode.id, self.targetNode.id], {}, function (err, result) {
                              //   Sparql_OWL.getNodeParents(Lineage_sources.activeSource, null, [self.sourceNode.id, self.targetNode.id], ancestorsDepth, {}, function (err, result) {
                              if (err) return callbackSeries(err);
                              var topLevelOntologyPattern = Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern;
                              var sourceNodeFirsttopLevelOntologyAncestorLabel = "";
                              var targetNodeFirsttopLevelOntologyAncestorLabel = "";
                              result.forEach(function (item) {
                                  if (!sourceNodeFirsttopLevelOntologyAncestor && item.class.value == self.sourceNode.id) {
                                      if (item.superClass.value.indexOf(topLevelOntologyPattern) > -1) {
                                          sourceNodeFirsttopLevelOntologyAncestor = item.superClass.value;
                                          sourceNodeFirsttopLevelOntologyAncestorLabel = item.superClassLabel ? item.superClassLabel.value : Sparql_common.getLabelFromURI(item.superClass.value);
                                      }
                                  }
                                  if (!targetNodeFirsttopLevelOntologyAncestor && item.class.value == self.targetNode.id) {
                                      if (item.superClass.value.indexOf(topLevelOntologyPattern) > -1) {
                                          targetNodeFirsttopLevelOntologyAncestor = item.superClass.value;
                                          targetNodeFirsttopLevelOntologyAncestorLabel = item.superClassLabel ? item.superClassLabel.value : Sparql_common.getLabelFromURI(item.superClass.value);
                                      }
                                  }
                              });
                              var title = self.sourceNode.label + " -> " + self.targetNode.label + "<br>";

                              if (!sourceNodeFirsttopLevelOntologyAncestor || !targetNodeFirsttopLevelOntologyAncestor) {
                                  // alert("no matching topLevelOntology superClass");
                                  title += "no matching superClass in " + Config.currentTopLevelOntology;
                                  MainController.UI.message("no matching superClass in " + Config.currentTopLevelOntology);
                                  return callbackSeries();
                              }

                              title += "<i>" + Config.currentTopLevelOntology + " : " + sourceNodeFirsttopLevelOntologyAncestorLabel + " -> " + targetNodeFirsttopLevelOntologyAncestorLabel + "</i>";
                              $("#lineageAddEdgeDialog_Title").html(title);

                              self.getAuthorizedProperties(
                                Config.currentTopLevelOntology,
                                sourceNodeFirsttopLevelOntologyAncestor,
                                targetNodeFirsttopLevelOntologyAncestor,
                                function (err, _authorizedProps) {
                                    authorizedProps = _authorizedProps;
                                    return callbackSeries();
                                }
                              );
                          });
                      },

                      //create formal Ontology tree nodes
                      function (callbackSeries) {
                          for (var prop in authorizedProps) {
                              var propObj = authorizedProps[prop];
                              if (propObj.children) {
                                  propObj.children.forEach(function (child) {
                                      if (!distinctProps[child.id]) {
                                          jstreeData.push({
                                              id: child.id,
                                              text: "<span class='" + cssClass + "'>" + child.label + "</span>",
                                              parent: propObj.prop,
                                              data: {
                                                  id: child.id,
                                                  label: child.label,
                                                  source: Config.currentTopLevelOntology,
                                              },
                                          });
                                      }
                                  });
                              }

                              if (!distinctProps[propObj.prop]) {
                                  var label;
                                  var cssClass = "lineageAddEdgeDialog_topLevelOntologyProp";
                                  if (propObj.type != "") cssClass = "lineageAddEdgeDialog_topLevelOntologySemiGenericProp";
                                  if (propObj.isGenericProperty) {
                                      cssClass = "lineageAddEdgeDialog_topLevelOntologyGenericProp";
                                      label = "any" + "-" + propObj.label + "->" + "any";
                                  } else
                                      label =
                                        Sparql_common.getLabelFromURI(propObj.type.indexOf("R") ? sourceNodeFirsttopLevelOntologyAncestor : "any") +
                                        "-" +
                                        propObj.label +
                                        "->" +
                                        Sparql_common.getLabelFromURI(propObj.type.indexOf("D") ? targetNodeFirsttopLevelOntologyAncestor : "any");

                                  jstreeData.push({
                                      id: propObj.prop,
                                      text: "<span class='" + cssClass + "'>" + label + "</span>",
                                      parent: "#",
                                      data: {
                                          id: propObj.prop,
                                          label: propObj.label,
                                          source: Config.currentTopLevelOntology,
                                      },
                                  });
                              }
                          }

                          callbackSeries();
                      },
                      /*   function(callbackSeries) {
return callbackSeries();
if (!Config.sources[Lineage_sources.activeSource].editable) {
$("#lineageAddEdgeDialog_currentSourcePropertiesTreeDiv").html("source " + Lineage_sources.activeSource + " is not editable");
return callbackSeries();
}

Lineage_properties.getPropertiesjsTreeData(inSource, null, null, {}, function(err, jstreeData3) {
if (err) return callbackSeries(err);
let jstreeDataX = [];
jstreeDataX.forEach(function(item) {
item.data.inSource = inSource;
});

jstreeDataX.push({
id: inSource,
text: inSource,
parent: "#"
});
jstreeData = jstreeData.concat(jstreeDataX);
//  common.jstree.loadJsTree("lineageAddEdgeDialog_currentSourcePropertiesTreeDiv", jstreeData3, options);

callbackSeries();
});
},*/

                      //get specific(mainSource) source properties
                      function (callbackSeries) {
                          if (self.currentSpecificObjectPropertiesMap) return callbackSeries();
                          var specificSourceLabel = Lineage_common.currentSource || Lineage_sources.activeSource;

                          Sparql_OWL.listObjectProperties(specificSourceLabel, null, function (err, result) {
                              if (err) return callbackSeries(err);
                              self.currentSpecificObjectPropertiesMap = {};
                              result.forEach(function (item) {
                                  if (item.superProp) {
                                      if (!self.currentSpecificObjectPropertiesMap[item.superProp.value]) self.currentSpecificObjectPropertiesMap[item.superProp.value] = [];
                                      self.currentSpecificObjectPropertiesMap[item.superProp.value].push({
                                          id: item.prop.value,
                                          label: item.propLabel.value,
                                      });
                                  }
                              });
                              return callbackSeries();
                          });
                      },

                      //add specific(mainSource) source properties to jstree data
                      function (callbackSeries) {
                          var specificSourceLabel = Lineage_common.currentSource || Lineage_sources.activeSource;
                          var cssClass = "lineageAddEdgeDialog_topLevelOntologySpecificProp";
                          jstreeData.forEach(function (node) {
                              if (self.currentSpecificObjectPropertiesMap[node.id]) {
                                  self.currentSpecificObjectPropertiesMap[node.id].forEach(function (item) {
                                      jstreeData.push({
                                          id: item.id,
                                          text: "<span class='" + cssClass + "'>" + item.label + "</span>",
                                          parent: node.id,
                                          data: {
                                              id: item.id,
                                              label: item.label,
                                              source: specificSourceLabel,
                                          },
                                      });
                                  });
                              }
                          });
                          return callbackSeries();
                      },
                      function (callbackSeries) {
                          options.contextMenu = {
                              refineProperty: {
                                  label: "Refine Property",
                                  action: function (_e) {
                                      if (self.currentPropertiesTreeNode.data.source != Config.currentTopLevelOntology)
                                          return alert("only properties from " + Config.currentTopLevelOntology + " can be refined");
                                      var subPropertyLabel = prompt("enter label for subProperty of property " + self.currentPropertiesTreeNode.data.label);
                                      if (!subPropertyLabel) return;
                                      Lineage_blend.createSubProperty(Lineage_sources.activeSource, self.currentPropertiesTreeNode.data.id, subPropertyLabel, function (err, result) {
                                          if (err) return alert(err);

                                          if (!self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id])
                                              self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id] = [];
                                          self.currentSpecificObjectPropertiesMap[self.currentPropertiesTreeNode.data.id].push({
                                              id: result.uri,
                                              label: subPropertyLabel,
                                          });

                                          var jstreeData = [
                                              {
                                                  id: result.uri,
                                                  text: subPropertyLabel,
                                                  parent: self.currentPropertiesTreeNode.data.id,
                                                  data: {
                                                      id: result.uri,
                                                      label: subPropertyLabel,
                                                      source: Lineage_sources.activeSource,
                                                  },
                                              },
                                          ];

                                          common.jstree.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", self.currentPropertiesTreeNode.data.id, jstreeData, options);
                                      });
                                  },
                              },
                              nodeInfos: {
                                  label: "Node infos",
                                  action: function (_e) {
                                      // pb avec source
                                      SourceBrowser.showNodeInfos(self.currentPropertiesTreeNode.data.source, self.currentPropertiesTreeNode, "mainDialogDiv");
                                  },
                              },
                          };

                          common.jstree.loadJsTree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", jstreeData, options);
                          callbackSeries();
                      },
                  ],

                  function (err) {
                      if (err) return callback(err);

                      if (edgeData.from === edgeData.to) {
                          return callback(null);
                      } else {
                          return callback(null);
                      }
                  }
                );
            });
        },
        execAddEdgeFromGraph: function () {},
        addGenericPredicatesToPredicatesTree: function () {
            var jstreeData = [];
            self.authorizedProperties[Config.currentTopLevelOntology].forEach(function (item) {
                if (item.isGenericProperty) {
                    var text = "<span class='lineageAddEdgeDialog_topLevelOntologyGenericProp'>" + (item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value)) + "</span>";

                    jstreeData.push({
                        id: item.prop.value,
                        text: text,
                        parent: "#",
                        data: {
                            id: item.prop.value,
                            label: item.propLabel,
                            source: Config.currentTopLevelOntology,
                        },
                    });
                }
            });

            common.jstree.addNodesToJstree("lineageAddEdgeDialog_authorizedPredicatesTreeDiv", "#", jstreeData, { positionLast: 1 });
        },
        createRelationFromGraph: function (inSource, sourceNode, targetNode, propId, options, callback) {
            if (!confirm("create Relation " + sourceNode.label + "-" + Sparql_common.getLabelFromURI(propId) + "->" + targetNode.label + " in Graph " + inSource)) return;
            $("#LineagePopup").dialog("close");

            var isRestriction = true;
            if (propId == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" || propId == "http://www.w3.org/2000/01/rdf-schema#subClassOf") isRestriction = false;
            if (sourceNode.type == "NamedIndividual") isRestriction = false;
            if (propId == "http://www.w3.org/2002/07/owl#sameAs" && sourceNode.source == Lineage_sources.activeSource && targetNode.source == Lineage_sources.activeSource) isRestriction = false;

            if (!isRestriction) {
                var triples = [];
                triples.push({
                    subject: sourceNode.id,
                    predicate: propId,
                    object: targetNode.id,
                });

                Sparql_generic.insertTriples(inSource, triples, {}, function (err, _result) {
                    if (err) return callback(err);
                    return callback(null, _result);
                });
            } else {
                var oldRelations = visjsGraph.getNodeEdges(sourceNode.id, targetNode.id);
                self.createRelation(inSource, propId, sourceNode, targetNode, true, true, {}, function (err, blankNodeId) {
                    if (err) return callback(err);
                    MainController.UI.message("relation added", true);

                    if (oldRelations.length > 0) {
                        if (confirm("delete previous relation " + oldRelations[0].data.propertyLabel)) {
                            Lineage_blend.deleteRestriction(Lineage_sources.activeSource, oldRelations[0], function (err) {
                                if (err) alert(err);
                            });
                        }
                    }

                    return callback(null, blankNodeId);
                });
            }
        },
    };

    self.getAuthorizedProperties = function (sourceLabel, domain, range, callback) {
        self.loadSourcePossiblePredicates(sourceLabel, false, function (err, allProps) {
            if (err) return alert(err);

            let props = {};

            var subProposMap = {};

            allProps.forEach(function (item) {
                if (item.prop.value.indexOf("concret") > -1) var x = 3;
                let type = "";
                let ok = false;
                if (!item.range && item.domain && (item.domain.value == domain || item.domaintype == "bnode")) {
                    type = "D";
                    ok = true;
                } else if (!item.domain && item.range && (item.range.value == range || item.domaintype == "bnode")) {
                    type = "R";
                    ok = true;
                } else if (item.domain && item.range && item.domain.value == domain && item.range.value == range) ok = true;

                if (ok) {
                    props[item.prop.value] = {
                        prop: item.prop.value,
                        label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                        type: type,
                    };
                }
            });
            if (true || Object.keys(props).length == 0) {
                allProps.forEach(function (item) {
                    if (item.isGenericProperty) {
                        props[item.prop.value] = {
                            prop: item.prop.value,
                            label: item.propLabel ? item.propLabel.value : Sparql_common.getLabelFromURI(item.prop.value),
                            isGenericProperty: item.isGenericProperty,
                        };
                    }
                });
            }
            return callback(null, props);
        });
    };

    self.loadSourcePossiblePredicates = function (sourceLabel, reload, callback) {
        if (!self.authorizedProperties) self.authorizedProperties = {};

        if (self.authorizedProperties[sourceLabel] && !reload && callback) return callback(null, self.authorizedProperties[sourceLabel]);

        var allProps;
        async.series(
          [
              function (callbackSeries) {
                  Sparql_OWL.getInferredPropertiesDomainsAndRanges(sourceLabel, {}, function (err, _result) {
                      if (err) return callbackSeries(err);

                      allProps = _result;
                      return callbackSeries();
                  });
              },
              function (callbackSeries) {
                  Sparql_OWL.getPropertiesWithoutDomainsAndRanges(sourceLabel, {}, function (err, _result2) {
                      if (err) return callbackSeries(err);
                      // allProps = allProps.concat(_result2)
                      _result2.forEach(function (item) {
                          item.isGenericProperty = true;
                          allProps.push(item);
                      });
                      return callbackSeries();
                  });
              },
          ],
          function (err) {
              self.authorizedProperties[sourceLabel] = allProps;
              if (callback) return callback(err, allProps);
          }
        );
    };

    self.getSourcePossiblePredicatesAndObject = function (source, callback) {
        var predicates = [];
        KGcreator.usualProperties.forEach(function (item) {
            predicates.push({ label: item, id: item });
        });

        Sparql_OWL.getDictionary(source, { selectGraph: true }, null, function (err, result) {
            if (err) callback(err);

            var sourceObjects = [];
            var TopLevelOntologyObjects = [];
            result.forEach(function (item) {
                if (item.id.type == "bnode") return;

                if (!item.label) item.label = { value: Sparql_common.getLabelFromURI(item.id.value) };
                var prefix = "";
                if (item.g.value.indexOf(Config.topLevelOntologies[Config.currentTopLevelOntology].uriPattern) > -1) {
                    prefix = Config.topLevelOntologies[Config.currentTopLevelOntology].prefix + ":";
                    TopLevelOntologyObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
                } else {
                    if (item.label) sourceObjects.push({ label: prefix + item.label.value, id: item.id.value, type: "Class" });
                }
            });
            sourceObjects.sort(function (a, b) {
                if (!a.label || !b.label) return 0;
                if (a.label > b.label) return 1;
                if (a.label < b.label) return -1;
                return 0;
            });

            var usualObjects = [];
            KGcreator.usualObjectClasses.forEach(function (item) {
                if (item.indexOf("_") < 0) usualObjects.push({ label: item, id: item });
            });

            var basicTypeClasses = [];
            KGcreator.basicTypeClasses.forEach(function (item) {
                basicTypeClasses.push({ label: item, id: item });
            });

            // var allObjects=usualObjects.concat(sourceObjects);
            return callback(null, {
                predicates: predicates,
                usualObjects: usualObjects,
                sourceObjects: sourceObjects,
                TopLevelOntologyObjects: TopLevelOntologyObjects,
                basicTypeClasses: basicTypeClasses,
            });
        });
    };
    self.getCommonMetaDataTriples = function (subjectUri, source, status, options) {
        var metaDataTriples = [];
        if (!options) options = {};
        var login = authentication.currentUser.login;
        //  var authorUri = Config.defaultNewUriRoot + "users/" + login;
        var dateTime = common.dateToRDFString(new Date()) + "^^xsd:dateTime";

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/creator",
            object: login,
        });

        metaDataTriples.push({
            subject: subjectUri,
            predicate: "http://purl.org/dc/terms/created",
            object: dateTime,
        });
        if (status)
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "https://www.dublincore.org/specifications/bibo/bibo/bibo.rdf.xml#status",
                object: status,
            });
        if (source)
            metaDataTriples.push({
                subject: subjectUri,
                predicate: "http://purl.org/dc/terms/source",
                object: source,
            });
        if (options) {
            for (var key in options) {
                metaDataTriples.push({
                    subject: subjectUri,
                    predicate: (Config.sousLeSensVocablesGraphUri || "http://data.souslesens.org/") + "property#" + key,
                    object: options[key],
                });
            }
        }

        return metaDataTriples;
    };

    return self;
})();