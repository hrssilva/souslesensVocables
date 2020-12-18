var MainController = (function () {
    var self = {}

    self.currentTool = null


    self.loadSources = function (callback) {

        $.getJSON("config/sources.json", function (json) {
            Config.sources = json;
            if(callback)
                return callback()

        });

    }


    self.UI = {

        showSources: function (treeDiv, withCBX) {
            var treeData = [];
            Object.keys(Config.sources).sort().forEach(function (sourceLabel, index) {
                if (Config.currentProfile.allowedSourceSchemas.indexOf(Config.sources[sourceLabel].schemaType) < 0)
                    return;
                Config.sources[sourceLabel].name = sourceLabel
                if (!Config.sources[sourceLabel].controllerName) {
                    Config.sources[sourceLabel].controllerName = "" + Config.sources[sourceLabel].controller
                    Config.sources[sourceLabel].controller = eval(Config.sources[sourceLabel].controller)
                }
                if (!Config.sources[sourceLabel].color)
                    Config.sources[sourceLabel].color = common.palette[index % common.palette.length];

                treeData.push({id: sourceLabel, text: sourceLabel, parent: "#", data: Config.sources[sourceLabel]})
            })
            common.loadJsTree(treeDiv, treeData, {
                withCheckboxes: withCBX,
                selectNodeFn: function (evt, obj) {
                    self.currentSource = obj.node.id;
                    MainController.UI.onSourceSelect()

                }
            })
        },

        showToolsList: function (treeDiv) {
            var x = $(window).height()
            $(".max-height").height($(window).height() - 300)
            var treeData = []
            for (var key in Config.tools) {
                // Object.keys(Config.tools).forEach(function (toolLabel) {
                treeData.push({id: key, text: Config.tools[key].label, parent: "#", data: Config.tools[key]})

            }
            //})
            common.loadJsTree(treeDiv, treeData, {
                selectNodeFn: function (evt, obj) {
                    self.currentTool = obj.node.id;
                    self.currentSource = null;
                    MainController.UI.showSources("sourcesTreeDiv", obj.node.data.multiSources);
                    Clipboard.clear();
                    $("#accordion").accordion("option", {active: 1});
                    var controller = Config.tools[self.currentTool].controller
                    $("#actionDivContolPanelDiv").html("")
                    self.UI.updateActionDivLabel();
                    if (Config.tools[self.currentTool].multiSources)
                        controller.onSourceSelect(self.currentSource)
                    if (controller.onLoaded)
                        controller.onLoaded()
                    if (Config.tools[self.currentTool].toolDescriptionImg) {
                        $("#graphDiv").html("<img src='" + Config.tools[self.currentTool].toolDescriptionImg + "' width='600px' style='toolDescriptionImg'>")
                    } else
                        $("#graphDiv").html(self.currentTool);

                }
            })

        },
        onSourceSelect: function () {

            if (Config.tools[self.currentTool].multiSources)
                return

            Collection.currentCollectionFilter=null;
            self.UI.updateActionDivLabel()
            var controller = Config.tools[self.currentTool].controller
            controller.onSourceSelect(self.currentSource)

            /*    if (self.currentTool == 0) {
                    ThesaurusBrowser.showThesaurusTopConcepts(self.currentSource)
                }*/


        },
        showNodeInfos: function (sourceLabel, nodeId, divId, callback) {

            Sparql_generic.getNodeInfos(sourceLabel, nodeId, null, function (err, result) {
                if (err) {
                    return MainController.UI.message(err);
                }
                if (divId.indexOf("Dialog") > -1) {
                    $("#"+divId).dialog("open");
                }
                SourceEditor.showNodeInfos(divId, "en",nodeId, result)

                if (callback)
                    return callback()
            })


        },

        message: function (message) {
            $("#messageDiv").html(message)
        },


        setCredits: function () {

            var html = "<div><span class='topTitle'>SousLeSens Vocables</span><br>" +
                "  <img src=\"images/description.png\"></div>"
            $("#graphDiv").html(html)


        },

        updateActionDivLabel: function (html) {
            if (html)
                $("#sourcePanelLabel").html(html)
            if (self.currentSource)
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label + " : " + self.currentSource)
            else
                $("#sourcePanelLabel").html(Config.tools[self.currentTool].label);


        },

        showPopup: function (point, popupDiv) {
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("left", point.x + leftPanelWidth)
            $("#" + popupDiv).css("top", point.y)
            $("#" + popupDiv).css("display", "flex")
        },
        hidePopup: function (popupDiv) {
            if (!popupDiv)
                popupDiv = "popupDiv"
            $("#" + popupDiv).css("display", "none")
        },


        showInCentralPanelDiv: function (divId) {
            if (divId == "graphDiv") {
                $("#graphDiv").css("display", "block")
                $("#blendDiv").css("display", "none")
            } else if (divId = "blendDiv" && Blender.displayMode == "centralPanel") {
                $("#graphDiv").css("display", "none")
                $("#blendDiv").css("display", "block")
            }

        }
    }

    self.test=function(){
        self.loadSources(function(){
            MainController.currentSource="NPD"
            ThesaurusBrowser.currentTreeNode={data:{id:"http://sws.ifi.uio.no/vocab/npd-v2#Wellbore"}}
            OntologyBrowser.showProperties()
        })

    }


    return self;


})()
