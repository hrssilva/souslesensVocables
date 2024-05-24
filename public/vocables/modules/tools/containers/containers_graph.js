import Lineage_whiteboard from "../lineage/lineage_whiteboard.js";
import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

var Containers_graph = (function () {
    var self = {};

    self.containerStyle = { shape: "square", color: "#fdac00", size: 15, edgeColor: "#e7a1be", parentContainerColor: "#778dd7" };

    self.getContainerTypes = function (source, options, callback) {
        if (!options) {
            options = {};
        }
        var fromStr = Sparql_common.getFromStr(source, false, options.withoutImports);
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
            "SELECT distinct ?type ?typeLabel " +
            fromStr +
            "  WHERE {\n" +
            " ?sub rdf:type rdf:Bag  .\n" +
            "  ?sub rdf:type  ?type . filter (!regex(str(?type),'owl') && ?type!='rdf:Bag')\n" +
            "  optional {?type rdfs:label ?typeLabel}" +
            "  }";

        var sparql_url = Config.sources[source].sparql_server.url;
        var url = sparql_url + "?format=json&query=";

        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", { source: source }, function (err, result) {
            if (err) {
                return callback(err);
            }
            var types = [];
            result.results.bindings.forEach(function (item) {
                var typeLabel = item.typeLabel ? item.typeLabel.value : Sparql_common.getLabelFromURI(item.type.value);
                types.push({ id: item.type.value, label: typeLabel });
            });
            return callback(null, types);
        });
    };

    self.graphParentContainers = function (source, ids, options, callback) {
        if (!options) {
            options = {};
        }
        if (!source) {
            source = Lineage_sources.activeSource;
        }
        var fromStr = Sparql_common.getFromStr(source, false, true);
        if (!ids) {
            ids = Lineage_whiteboard.lineageVisjsGraph.data.nodes.getIds();
        }
        var filter = Sparql_common.setFilter("node", ids);

        if (options.filter) {
            filter += options.filter;
        }

        options.depth = 1;

        Containers_query.getContainersAscendants(source, ids, options, function (err, result) {
            if (err) return alert(err.responseText);

            var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
            var visjsData = { nodes: [], edges: [] };

            result.forEach(function (item) {
                if (!existingNodes[item.ancestor.value]) {
                    existingNodes[item.ancestor.value] = 1;

                    var label = item.ancestorLabel ? item.ancestorLabel.value : Sparql_common.getLabelFromURI(item.ancestor.value);

                    visjsData.nodes.push({
                        id: item.ancestor.value,
                        label: label,
                        shadow: self.nodeShadow,
                        shape: Containers_graph.containerStyle.shape,
                        size: Containers_graph.containerStyle.size,
                        font: { color: color2 },
                        color: Containers_graph.containerStyle.parentContainerColor,
                        data: {
                            type: "container",
                            source: Lineage_sources.activeSource,
                            id: item.ancestor.value,
                            label: label,
                        },
                    });
                }

                var edgeId = item.ancestor.value + "_" + "member" + "_" + item.ancestorChild.value;
                if (!existingNodes[edgeId]) {
                    existingNodes[edgeId] = 1;

                    visjsData.edges.push({
                        id: edgeId,
                        from: item.ancestor.value,
                        to: item.ancestorChild.value,
                        arrows: "to",

                        data: { from: item.ancestor.value, to: item.ancestorChild.value, source: source },
                        font: { multi: true, size: 10 },

                        //  dashes: true,
                        color: Containers_graph.containerStyle.edgeColor,
                    });
                }
            });

            Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
            Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);

            Lineage_whiteboard.lineageVisjsGraph.network.fit();
            $("#waitImg").css("display", "none");
            if (callback) {
                return callback(null, visjsData);
            }
        });
    };

    self.graphResources = function (source, containerData, options, callback) {
        if (!options) {
            options = {};
        }

        var data = [];
        var descendants = [];
        var stylesMap = {};
        var visjsData;
        async.series(
            [
                //getContainers descendants type container
                function (callbackSeries) {
                    //  options.descendants = true;
                    // options.leaves = true;
                    MainController.UI.message("searching...");
                    Containers_query.getContainerDescendantsOld(source, containerData.id, options, function (err, result) {
                        if (err) {
                            return callbackSeries(err);
                        }
                        data = data.concat(result.results.bindings);
                        if (data.length > Lineage_whiteboard.showLimit * 8) {
                            return callbackSeries({ responseText: "too many nodes " + data.length + " cannot draw" });
                        }
                        return callbackSeries();
                    });
                    MainController.UI.message("drawing graph...");
                },

                //get containersStyles
                function (callbackSeries) {
                    return callbackSeries();
                },

                //draw
                function (callbackSeries) {
                    var color = Lineage_whiteboard.getSourceColor(source);
                    var opacity = 1.0;
                    var existingNodes = Lineage_whiteboard.lineageVisjsGraph.getExistingIdsMap();
                    visjsData = { nodes: [], edges: [] };
                    var objectProperties = [];

                    var shape = "dot";
                    var color2 = common.colorToRgba(color, opacity * 0.7);
                    var memberEdgeColor = common.colorToRgba(self.containerEdgeColor, opacity * 0.7);
                    var size = Lineage_whiteboard.defaultShapeSize;

                    if (!existingNodes[containerData.id]) {
                        existingNodes[containerData.id] = 1;

                        var type = "container";
                        visjsData.nodes.push({
                            id: containerData.id,
                            label: containerData.label,
                            shadow: self.nodeShadow,
                            shape: Lineage_containers.containerStyle.shape,
                            size: size,
                            font: type == "container" ? { color: "#70309f" } : null,
                            color: Lineage_containers.containerStyle.color,
                            data: {
                                type: type,
                                source: source,
                                id: containerData.id,
                                label: containerData.label,
                            },
                        });
                    }

                    data.forEach(function (item) {
                        if (!existingNodes[item.parent.value]) {
                            var type = "container";
                            existingNodes[item.parent.value] = 1;
                            visjsData.nodes.push({
                                id: item.parent.value,
                                label: item.parentLabel.value,
                                shadow: self.nodeShadow,
                                shape: type == "container" ? Lineage_containers.containerStyle.shape : shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: Lineage_containers.containerStyle.color,
                                data: {
                                    type: type,
                                    source: source,
                                    id: item.parent.value,
                                    label: item.parentLabel.value,
                                },
                            });
                        }

                        if (!existingNodes[item.member.value]) {
                            var color = Lineage_containers.containerStyle.color;
                            var shape = Lineage_containers.containerStyle.shape;
                            var type = "container";
                            if (item.memberTypes.value.indexOf("Bag") < 0) {
                                color = Lineage_whiteboard.getSourceColor(Lineage_sources.activeSource);
                                if (item.memberTypes.value.indexOf("Individual") > -1) {
                                    type = "individual";
                                    shape = "triangle";
                                } else {
                                    type = "class";
                                    shape = Lineage_whiteboard.defaultShape;
                                    shape = "dot";
                                }
                            }

                            existingNodes[item.member.value] = 1;
                            visjsData.nodes.push({
                                id: item.member.value,
                                label: item.memberLabel.value,
                                shadow: self.nodeShadow,
                                shape: shape,
                                size: size,
                                font: type == "container" ? { color: color2, size: 10 } : null,
                                color: color,

                                data: {
                                    type: type,
                                    source: source,
                                    id: item.member.value,
                                    label: item.memberLabel.value,
                                },
                            });
                        }

                        if (item.member.value != item.parent.value) {
                            var edgeId = item.parent.value + "_" + "member" + "_" + item.member.value;

                            if (!existingNodes[edgeId]) {
                                existingNodes[edgeId] = 1;
                                var type = "container";
                                if (item.memberTypes.value.indexOf("Bag") < 0) {
                                    type = "class";
                                }
                                visjsData.edges.push({
                                    id: edgeId,
                                    from: item.parent.value,
                                    to: item.member.value,
                                    arrows: {
                                        enabled: true,
                                        type: Lineage_whiteboard.defaultEdgeArrowType,
                                        scaleFactor: 0.5,
                                    },
                                    data: {
                                        from: item.parent.value,
                                        to: item.member.value,
                                        source: source,
                                    },
                                    //  dashes: true,
                                    width: type == "container" ? 1 : 0.5,
                                    color: self.containerStyle.edgeColor,
                                });
                            }
                        }
                    });

                    function setNodesLevel(visjsData) {
                        var nodelevels = {};

                        function recurse(from, level) {
                            visjsData.edges.forEach(function (edge) {
                                if (edge.from == edge.to) {
                                    return;
                                }
                                if (edge.from == from) {
                                    if (!nodelevels[edge.to]) {
                                        nodelevels[edge.to] = level + 1;
                                        recurse(edge.to, level + 1);
                                    }
                                }
                            });
                        }

                        recurse(containerData.id, 1);
                        var maxLevel = 0;
                        visjsData.nodes.forEach(function (node, index) {
                            var level = (nodelevels[node.id] || 0) - 1;
                            if (node.id == containerData.id) {
                                level = 0;
                            }

                            maxLevel = Math.max(maxLevel, level);
                            visjsData.nodes[index].level = level;
                        });

                        visjsData.nodes.forEach(function (node, index) {
                            if (node.level == -1) {
                                node.level = maxLevel;
                            } else {
                                node.level = node.level;
                            }
                        });
                    }

                    //    setNodesLevel(visjsData);

                    if (!Lineage_whiteboard.lineageVisjsGraph.isGraphNotEmpty()) {
                        Lineage_whiteboard.drawNewGraph(visjsData, null, { noDecorations: 1 });
                    } else {
                        Lineage_whiteboard.lineageVisjsGraph.data.nodes.add(visjsData.nodes);
                        Lineage_whiteboard.lineageVisjsGraph.data.edges.add(visjsData.edges);
                    }
                    Lineage_whiteboard.lineageVisjsGraph.network.fit();
                    $("#waitImg").css("display", "none");
                    if (objectProperties.length > 0) {
                        source = Lineage_sources.activeSource;
                        var options = {
                            filter: Sparql_common.setFilter("prop", objectProperties),
                        };
                        options.allNodes = false;
                        Lineage_relations.drawRelations(null, null, "Properties", options);
                    }
                    return callbackSeries();
                },
            ],
            function (err) {
                MainController.UI.message("", true);
                if (err) {
                    return alert(err.responseText);
                    if (callback) {
                        return callback(err);
                    }
                }
                if (callback) {
                    return callback(null, visjsData);
                }
                return;
            }
        );
    };

    return self;
})();

export default Containers_graph;
window.Container_graph = Containers_graph;
