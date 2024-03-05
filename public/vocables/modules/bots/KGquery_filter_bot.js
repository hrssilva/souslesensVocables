import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import Sparql_OWL from "../sparqlProxies/sparql_OWL.js";
import BotEngine from "./botEngine.js";

var KGquery_filter_bot = (function () {
    var self = {};
    self.title = "Filter Class";

    self.start = function (currentQuery, validateFn) {
        BotEngine.init(KGquery_filter_bot, self.workflow_filterClass, null, function () {
            self.validateFn = validateFn;
            self.callbackFn = function () {
                var filterLabel = BotEngine.getQueryText();
                return self.validateFn(null, { filter: self.filter, filterLabel: filterLabel });
            };

            self.params = currentQuery;
            SparqlQuery_bot.params = currentQuery;
            BotEngine.nextStep();
        });
    };

    self.workflow_filterClass = {
        listFilterTypes: {
            _OR: {
                label: { promptIndividualsLabelFn: { setSparqlQueryFilter: {} } },
                list: { listIndividualsFn: { setSparqlQueryFilter: {} } },
                // advanced: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                // date: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                //  period: { promptIndividualsAdvandedFilterFn: { setSparqlQueryFilter: {} } },
                // }
            },
        },
    };

    self.functions = SparqlQuery_bot.functions;

    (self.functions.listFilterTypes = function () {
        var choices = ["label", "list"];
        BotEngine.showList(choices, "individualsFilterType");
    }),
        (self.functions.setSparqlQueryFilter = function (queryParams, varName) {
            var varName = self.params.varName;
            var individualsFilterType = self.params.individualsFilterType;
            var individualsFilterValue = self.params.individualsFilterValue;
            var advancedFilter = self.params.advancedFilter || "";
            var filterLabel = self.params.queryText;

            self.filter = "";
            if (individualsFilterType == "label") {
                self.filter = Sparql_common.setFilter(varName, null, individualsFilterValue);
            } else if (individualsFilterType == "list") {
                self.filter = Sparql_common.setFilter(varName, individualsFilterValue, null, { useFilterKeyWord: 1 });
            } else if (individualsFilterType == "advanced") {
                self.filter = advancedFilter;
            }
            BotEngine.nextStep();
        });

    return self;
})();

export default KGquery_filter_bot;
window.KGquery_filter_bot = KGquery_filter_bot;
