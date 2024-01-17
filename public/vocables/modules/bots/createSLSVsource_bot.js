import botEngine from "./botEngine.js";
import Sparql_common from "../sparqlProxies/sparql_common.js";
import KGquery from "../tools/KGquery/KGquery.js";
import SparqlQuery_bot from "./sparqlQuery_bot.js";
import BotEngine from "./botEngine.js";
import Lineage_sources from "../tools/lineage/lineage_sources.js";
import CommonBotFunctions from "./commonBotFunctions.js";

var CreateSLSVsource_bot = (function () {
    var self = {};

    self.title = "Create Source";

    self.start = function () {
        BotEngine.init(CreateSLSVsource_bot, null, function () {
            self.params = { sourceLabel: "", graphUri: "", imports: [] };
            BotEngine.currentObj = self.workflow;
            BotEngine.nextStep(self.workflow);
        });
    };

    self.workflow2 = {
        _OR: {
            "create source": { saveFn: { loadLineage: {} } },
            "add import": { listImportsFn: { afterImportFn: {} } },
        },
    };

    self.workflow = {
        createSLSVsourceFn: {
            promptSourceNameFn: {
                promptGraphUriFn: self.workflow2,
            },
        },
    };

    self.functionTitles = {
        promptSourceNameFn: "enter source label",
        promptGraphUriFn: "enter source graphUri",
        listImportsFn: "add import ",
        saveFn: "create source",
    };
    self.functions = {
        createSLSVsourceFn: function () {
            BotEngine.nextStep();
        },
        promptSourceNameFn: function () {
            BotEngine.promptValue("source label", "sourceLabel");
        },
        promptGraphUriFn: function () {
            BotEngine.promptValue("graph Uri", "graphUri", "http://");
        },

        listImportsFn: function () {
            var sources = Object.keys(Config.sources);
            sources.sort();
            BotEngine.showList(sources, "imports");
        },

        afterImportFn: function () {
            BotEngine.previousStep();
        },

        saveFn: function () {
            Lineage_createSource.createSource(self.params.sourceLabel, self.params.graphUri, self.params.imports, function (err, result) {
                if (err) {
                    return alert(err);
                }
                return BotEngine.nextStep();
            });
        },
        loadLineage: function () {},
    };

    return self;
})();

export default CreateSLSVsource_bot;
window.CreateSLSVsource_bot = CreateSLSVsource_bot;
