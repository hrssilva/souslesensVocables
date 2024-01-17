import common from "../../shared/common.js";
import Sparql_common from "../../sparqlProxies/sparql_common.js";

var KGquery_controlPanel = (function () {
    var self = {};
    self.vicinityArray = [];

    self.addQuerySet = function (toDivId, booleanOperator, label, color) {
        var querySetDivId = "querySetDiv_" + common.getRandomHexaId(5);
        var booleanOperatorHtml = "";
        if (booleanOperator) {
            var unionStr = booleanOperator == "Union" ? "selected=selected" : "";
            var minusStr = booleanOperator == "Minus" ? "selected=selected" : "";
            booleanOperatorHtml =
                "<div style='  font-weight: bold;color: brown; '>" +
                " <select  onchange='KGquery.onBooleanOperatorChange(\"" +
                querySetDivId +
                "\",$(this).val())'> " +
                "<option " +
                unionStr +
                ">Union</option>" +
                "<option " +
                minusStr +
                ">Minus</option>" +
                "</select>" +
                "</div>";
        }
        var setHtml = "<div id='" + querySetDivId + "' class='KGquery_setDiv' style='color:" + color + ";border-color:" + color + "'>" + booleanOperatorHtml + label;

        if (booleanOperator) {
            setHtml += "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGquery_smallButton' onclick='KGquery.removeSet( \"" + querySetDivId + "\")' >X</button>";
        }
        // "<button onclick='' >save</button>" +
        setHtml += "</div>";

        $("#" + toDivId).append(setHtml);
        $("#" + querySetDivId).bind("click", function () {
            var id = $(this).attr("id");
        });

        return querySetDivId;
    };

    self.addQueryElementToCurrentSet = function (querySetDivId, color) {
        var queryElementDivId = "queryElementDiv_" + common.getRandomHexaId(5);
        var html =
            "<div  class='KGquery_pathDiv'  style='display:none;border:solid 2px " +
            color +
            "' id='" +
            queryElementDivId +
            "'>" +
            "&nbsp;<button class='btn btn-sm my-1 py-0 btn-outline-primary KGquery_smallButton' " +
            "onclick='KGquery.removeQueryElement( \"" +
            queryElementDivId +
            "\") '>X</button>" +
            ' <div class="queryElement_fromNode"></div>' +
            '<div class="queryElement_predicate"></div>' +
            '<div class="queryElement_toNode"></div>';

        ("</div>");
        $("#" + querySetDivId).append(html);
        return queryElementDivId;
    };

    self.addNodeToQueryElementDiv = function (queryElementDivId, role, label) {
        $("#" + queryElementDivId).css("display", "block");
        var nodeDivId = "nodeDiv_" + common.getRandomHexaId(5);
        var html = "";

        html +=
            "<div  class='KGquery_pathNodeDiv' id='" +
            nodeDivId +
            "'>" +
            "<span style='font:bold 14px'>" +
            label +
            "" +
            "<button class='KGquery_divActions btn btn-sm my-1 py-0 btn-outline-primary' about='add filter' onclick='KGquery.addNodeFilter(\"" +
            nodeDivId +
            "\");'>F</button>";

        html += "<div style='font-size: 10px;' id='" + nodeDivId + "_filter'></div> " + "</div>" + "</div>";

        $("#" + queryElementDivId)
            .find(".queryElement_" + role)
            .html(html);
        return nodeDivId;
    };

    self.addPredicateToQueryElementDiv = function (queryElementDivId, label) {
        $("#" + queryElementDivId)
            .find(".queryElement_predicate")
            .html(label);
    };

    self.getQueryElementPredicateLabel = function (queryElement) {
        var predicateLabel = "";
        queryElement.paths.forEach(function (path, index) {
            if (index > 0) {
                predicateLabel += ", ";
            }
            if (path.length > 3) {
                predicateLabel += "^";
            }
            predicateLabel += Sparql_common.getLabelFromURI(path[2]);
        });
        return predicateLabel;
    };

    return self;
})();
export default KGquery_controlPanel;
window.KGquery_controlPanel = KGquery_controlPanel;