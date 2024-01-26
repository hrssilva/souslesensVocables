import KGcreator from "../../modules/tools/KGcreator/KGcreator.js";
import KGcreator_mappings from "../../modules/tools/KGcreator/KGcreator_mappings.js";
import KGcreator_run from "../../modules/tools/KGcreator/KGcreator_run.js";

var KGcreator_r = (function () {
    var self = {};
    //changed files and functions
    self.oldshowHideEditButtons = Lineage_sources.showHideEditButtons;
    self.oldshowDialog = SavedQueriesComponent.showDialog;
    self.oldshowMappingDialog = KGcreator_mappings.showMappingDialog;
    self.init = function () {
        ResponsiveUI.initMenuBar(self.loadSource);
        $("#Lineage_graphEditionButtons").show();
        $("#Lineage_graphEditionButtons").empty();
        $("#Lineage_graphEditionButtons").attr("id", "KGcreator_topButtons");
        KGcreator_mappings.showMappingDialog = self.showMappingDialogResponsive;
    };
    self.quit = function () {
        Lineage_sources.registerSource = ResponsiveUI.oldRegisterSource;
        $("#KGcreator_topButtons").attr("id", "Lineage_graphEditionButtons");
        $("#MenuBar").css("height", "90px");
        $("#KGcreator_topButtons").css("flex-direction", "row");
    };
    self.loadSource = function () {
        Lineage_sources.loadSources(MainController.currentSource, function (err) {
            if (err) {
                return alert(err.responseText);
            }
            $("#graphDiv").load("./modules/tools/KGcreator/html/centralPanel.html", function () {
                $("#lateralPanelDiv").load("./responsive/KGcreator/html/leftPanel.html", function () {
                    KGcreator.currentSlsvSource = ResponsiveUI.source;
                    ResponsiveUI.openTab("lineage-tab", "KGcreator_source_tab", KGcreator_r.initLinkTab, "#MapButton");
                });
            });
        });
    };
    self.showHideEditButtons = function (source, hide) {
        $("#Lineage_graphEditionButtons").hide();
        if (!Lineage_whiteboard.lineageVisjsGraph.network) {
            return;
        }

        Lineage_whiteboard.lineageVisjsGraph.network.disableEditMode();
        $(".vis-edit-mode").css("display", "none");
    };
    self.showMenuButtons = function () {};
    self.initRunTab = function () {
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/runTab.html", function () {
            $("#KGcreator_topButtons").load("./responsive/KGcreator/html/runButtons.html", function () {
                $("#KGcreator_topButtons").css("padding", "4px");
                $("#MenuBar").css("height", "120px");
                $("#KGcreator_topButtons").css("flex-direction", "column");
                if (KGcreator.currentTreeNode) {
                    KGcreator_run.createTriples(true);
                }
            });
        });
    };
    self.initLinkTab = function () {
        $("#KGcreator_centralPanelTabs").load("./responsive/KGcreator/html/LinkTab.html", function () {
            KGcreator.initSource();
            $("#KGcreator_topButtons").load("./responsive/KGcreator/html/linkButtons.html", function () {
                $("#KGcreator_topButtons").css("padding", "4px");
                $("#MenuBar").css("height", "90px");
                $("#KGcreator_topButtons").css("flex-direction", "row");
            });
        });
    };
    self.showMappingDialogResponsive = function (addColumnClassType, options, callback) {
        self.oldshowMappingDialog(addColumnClassType, options, callback);
    };

    return self;
})();
export default KGcreator_r;
window.KGcreator_r = KGcreator_r;