import common from "../shared/common.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";

var IndividualAggregateWidget = (function () {
    var self = {};
    self.groupFunctions = ["COUNT", "SUM", "MAX", "MIN", "AVG", "concat"];

    self.showDialog = function (divId, loadClassesFn, validateFn, message) {
        self.validateFn = validateFn;
        self.functionVarClasses = [];
        self.groupByClasses = [];

        if (!divId) {
            divId = "smallDialogDiv";
            self.divId = divId;
            $("#smallDialogDiv").dialog("open");
        }
        $("#" + divId).load("snippets/individualAggregateWidget.html", function () {
            loadClassesFn(function (data) {
                var groupByClasses = [];
                var functionVarClasses = [];
                for (var key in data) {
                    var item = data[key];
                    if (item.data.datatype) {
                        self.functionVarClasses.push(item);
                    } else {
                        self.groupByClasses.push(item);
                    }
                }
                common.fillSelectOptions("individualAggregate_groupBySelect", self.groupByClasses, null, "label", "label");

                common.fillSelectOptions("individualAggregate_groupFunctionSelect", self.groupFunctions, null);
                if (message) $("#individualAggregate_messageDiv").html(message);
            });
        });
    };

    self.onGroupFunctionSelect = function (fn) {
        if (fn == "concat") {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", self.groupByClasses, null, "label", "label");
        } else if (fn == "COUNT") {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", self.groupByClasses.concat(self.functionVarClasses), null, "label", "label");
        } else {
            common.fillSelectOptions("individualAggregate_functionVariableSelect", self.functionVarClasses, null, "label", "label");
        }
    };

    self.onOKbutton = function () {
        var groupByClasses = $("#individualAggregate_groupBySelect").val();
        var groupFunctions = $("#individualAggregate_groupFunctionSelect").val();
        var fnVars = $("#individualAggregate_functionVariableSelect").val();

        var selectStr = "";
        var groupByStr = "";
        groupByClasses.forEach(function (item) {
            item = Sparql_common.formatStringForTriple(item, true);
            selectStr += "?" + item + " ?" + item + "_label  ";
            groupByStr += "?" + item + " ?" + item + "_label";
        });
        groupFunctions.forEach(function (fn) {
            var fnVar = Sparql_common.formatStringForTriple(fnVars[0], true);
            if (fn == "concat") selectStr += "(GROUP_CONCAT(distinct ?" + fnVar + ';SEPARATOR=",") AS ?concat_' + fnVar + ")";
            else if (fn == "COUNT") selectStr += " (" + fn + "(distinct ?" + fnVar + ") as ?" + fn + "_" + fnVar + ")";
            else selectStr += " (" + fn + "(distinct ?" + fnVar + "Value) as ?" + fn + "_" + fnVar + ")";
        });

        var aggregateClauses = { select: selectStr, groupBy: groupByStr };

        $("#" + self.divId).dialog("close");
        if (self.validateFn) {
            return self.validateFn(null, aggregateClauses);
        }
    };

    return self;
})();
export default IndividualAggregateWidget;
window.IndividualAggregateWidget = IndividualAggregateWidget;
