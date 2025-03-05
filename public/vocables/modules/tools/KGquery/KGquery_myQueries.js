import KGquery from "./KGquery.js";
import SavedQueriesWidget from "../../uiWidgets/savedQueriesWidget.js";
import KGquery_graph from "./KGquery_graph.js";


var KGquery_myQueries = (function () {
    var self = {};

    self.save = function (callback) {
        //   KGquery.execPathQuery({ dontExecute: true }, function (err, query) {
        
            var data = {
                querySets: KGquery.querySets,
                sparqlQuery: KGquery.currentSparqlQuery,
                optionalPredicatesSparql: KGquery.currentOptionalPredicatesSparql,
            };
            if(data.sparqlQuery == null){
                return alert("No query to save");
            }
            return callback(null, data);
       
       
        //  });
    };

    self.load = function (err, result) {
        // return; // ! not working correctly !!!!!!!!!!!!!!!!!!!!!!!!
        if (err) {
            return alert(err.responseText);
        }
        
        UI.openTab('lineage-tab','tabs_Query',KGquery.initQuery,$('#QueryTabButton'))
        //  $("#KGquery_leftPanelTabs").tabs("option", "active", 1);
        KGquery.clearAll();
        KGquery.switchRightPanel(true);
        var querySets = result.querySets.sets;
        var index = -1;
        if(result.optionalPredicatesSparql){
            self.currentOptionalPredicatesSparql = result.optionalPredicatesSparql;
        }
        var isSkippedElement = false;
        async.eachSeries(
            querySets,
            function (set, callbackEach1) {
                index++;
                var filters=set.classFiltersMap;
                var elementIndex=-1;
                
                async.eachSeries(
                    set.elements,
                    function (element, callbackEach2) {
                        var node = element.fromNode;
                        elementIndex++;
                        if(node){
                            if(node.id==element.toNode.id){
                                var edge=KGquery_graph.visjsData.edges.filter(function(edge){
                                    return edge.from==node.id && edge.to==node.id;
                                });
                                if(edge){
                                    KGquery.addEdgeNodes(node,element.toNode,edge[0]);
                                }
                                
                            }else{
                                KGquery.addNode(node, null, function (err1, result2) {
                                
                                    if(filters){
                                        Object.values(filters).forEach(function(filter){
                                            if(filter.class.id==node.id && !filter.isChecked){
                                                var classDivId=KGquery.querySets.sets[index].elements[elementIndex].fromNode.data.nodeDivId;
                                                if(classDivId){
                                                    KGquery.querySets.sets[index].classFiltersMap[classDivId] = filter;
                                                    $("#" + classDivId + "_filter").text( filter?.filter);
                                                    filter.isChecked = true;
                                                }
                                            }
                                        });
                                        
                                    }
                                    // cest KGquery.addNode qui rajoure le noeud precedent
                                    if(elementIndex>0 && !isSkippedElement) {
                                        
                                        return callbackEach2(err1)
                                    };
                                    node = element.toNode;
                                    KGquery.addNode(node, null, function (err2, result2) {
                                        if(filters){
                                            Object.values(filters).forEach(function(filter){
                                                if(filter.class.id==node.id && !filter.isChecked){
                                                    var classDivId=KGquery.querySets.sets[index].elements[elementIndex].toNode.data.nodeDivId;
                                                    if(classDivId){
                                                        KGquery.querySets.sets[index].classFiltersMap[classDivId] = filter;
                                                        $("#" + classDivId + "_filter").text( filter?.filter);
                                                        filter.isChecked = true;
                                                    }
                                                }
                                            });
                                            
                                        }
                                        isSkippedElement = false;
                                        return callbackEach2(err2);
                                    });
                                
                                });
                            }
                            
                            
                        }
                        else{
                            isSkippedElement = true;
                            return callbackEach2(null);
                        }
                    },
                    function (err2) {
                        return callbackEach1(err2);
                    },
                );
            },
            function (err1) {},
        );

        return;
        
    };

    return self;
})();

export default KGquery_myQueries;
window.KGquery_myQueries = KGquery_myQueries;
