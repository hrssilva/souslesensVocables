//import common from "../../shared/common.js";
//import Lineage_sets from "./lineage_sets.js";
//import Lineage_linkedData_mappings from "./linkedData/lineage_linkedData_mappings.js";

//import Lineage_graphTraversal from "./lineage_graphTraversal.js";
//import Lineage_selection from "./lineage_selection.js";
//import KGquery from "./assetQuery.js";
import visjsGraph from "../../../graph/visjsGraph2.js";
//import MainController from "../../shared/mainController.js";

var Lineage_linkedData_graph = (function() {
	self.testVisjsData = { nodes: [], edges: [] };
    self.defaultShape = "dot";
	self.defaultShapeSize = 5;
   	self.orphanShape = "square";
   	self.nodeShadow = true;
    self.objectPropertyColor = "#f50707";
    self.defaultEdgeArrowType = "triangle";
    self.defaultEdgeColor = "#aaa";
    self.defaultPredicateEdgeColor = "#266264";
    self.restrictionColor = "#fdbf01";
    self.namedIndividualShape = "triangle";
    self.namedIndividualColor = "#0067bb";
    self.defaultNodeFontColor = "#343434";
    self.defaultEdgeFontColor = "#343434";
    self.defaultLowOpacity = 0.35;
    
    // XXX The next two methods should maybe be moved to a SQL dedicated class (SQLquery ?)
    self.getColumnsSQLQuery = function (/*@type {String}*/tableName) {
        return "SELECT * FROM " + tableName + " WHERE 1 = 0;"; // This is universal and should work on any DB
    };
    
    self.getMetadataSQLQuery = function (/*@type {String}*/tableName) {
        // This needs access to the information_schema table, which could not be available
        return "SELECT * FROM information_schema.key_column_usage WHERE table_name = '" + tableName + "';";
    };

    // XXX XXX XXX XXX 
    
    self.displayAsGraph = function(node, jstreeDiv) {
        var headers = []
        if(node.parent == "#")
        {
            var columns = $("#" + jstreeDiv).jstree("get_children_dom", node);
        
            for(var i=0;i<columns.length;i++)
            {
                headers.push(columns[i].innerText);
            }
            
            self.dataNodeGraphFromColumns(node.id, headers);
        }
        else
        {
            alert("Please select a table");
        }
        

                
    }
    
    self.dataNodeTriplesFromFile = function (/*@type String*/ tableName, /*@type [String]*/ columns) {
        var tableUri = Config.linkedData_mappings_graphUri + tableName.replace(".", "_").replace(" ", "_"); 
        var ns_type = "<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>"
        var triples = []
        triples.push({
            subject: '<' + tableUri + '>',
            predicate: ns_type,
            object: "slsv:table"
        });
        columns.forEach((/*@type String*/ column) => {
            var columnUri = tableUri + '.' + column.replace(" ", "_");
            triples.push({
                subject: '<' + columnUri + '>',
                predicate: ns_type,
                object: "slsv:sql-column"
            });
            triples.push({
                subject: '<' + tableUri + '>',
                predicate: "slsv:hasColumn",
                object: '<' + columnUri + '>'
            });
        });       
        return triples;
        /*columnObj = {
            column: jstreeNode.data.id,
            table: jstreeNode.parent,
            database: KGcreator.currentCsvDir || KGcreator.currentDbName,
            context: self.context,
            type: "column",
        };*/
    }
    self.dataNodeGraphFromColumns = function (/*@type String*/ tableName, /*@type [String]*/ columns) {
        var nodeId = 999; // Fixed for testing only
    	self.testVisjsData = { nodes: [], edges: [] };
        var tableNode = {
            id: tableName,
            label: tableName,
            shadow: self.nodeShadow,
            shape: self.namedIndividualShape,
            size: self.defaultShapeSize,
            color: self.namedIndividualColor, 
            data: {
                id: tableName,
                label: tableName + "_hasColumn",
                source: tableName
            }
        };
        
        testVisjsData.nodes.push(tableNode);
        columns.forEach((column) => {
            var currNode = {
                id: tableName + '.' + column,
                label: column,
                shadow: self.nodeShadow,
                shape: self.namedIndividualShape,
                size: self.defaultShapeSize,
                color: self.namedIndividualColor,
                data: {
                    id: tableName + '.' + column,
                    label: column + "_isColumnOf",
                    source: tableNode.id,
                }
            };
            testVisjsData.nodes.push(currNode);

                   
            testVisjsData.edges.push({
                id: tableName + '_hasColumn_' + column,
                from: tableNode.id,
                label: "hasColumn",
                to: currNode.id,
                ahs: self.defaultEdgeArrowType
            });
            nodeId += 1;   
        });
    };
    
    self.drawTest = function () {
        visjsGraph.data.nodes.add(testVisjsData.nodes);
        visjsGraph.data.edges.add(testVisjsData.edges);
        
    };
    return self;
})();

export default Lineage_linkedData_graph;

window.Lineage_linkedData_graph = Lineage_linkedData_graph;
