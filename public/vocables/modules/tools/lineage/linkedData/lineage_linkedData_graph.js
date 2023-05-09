import common from "../../shared/common.js";
import Lineage_sets from "./lineage_sets.js";
import Lineage_linkedData_mappings from "./linkedData/lineage_linkedData_mappings.js";

import Lineage_graphTraversal from "./lineage_graphTraversal.js";
import Lineage_selection from "./lineage_selection.js";
import KGquery from "./assetQuery.js";
import visjsGraph from "../../graph/visjsGraph2.js";
import MainController from "../../shared/mainController.js";

var datamodel_graph = (function() {
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

}
