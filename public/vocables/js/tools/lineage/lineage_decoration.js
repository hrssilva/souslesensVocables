var Lineage_decoration = (function () {
    var self = {}

    self.init = function () {

        self.operationsMap = {
            "colorNodesByType":self.colorGraphNodesByType,
            "colorNodesByPart14TopType": self.colorNodesByPart14TopType
        }
        var operations = Object.keys(self.operationsMap)
        common.fillSelectOptions("Lineage_classes_graphDecoration_operationSelect", operations, true)

    }
    self.run = function (operation) {
        $("#Lineage_classes_graphDecoration_operationSelect").val("")
        self.operationsMap[operation]()

    }


    self.showGraphDecorationDialog = function () {
        $("#mainDialogDiv").load("snippets/lineage/graphDecoration.html", function () {
            $("#mainDialogDiv").dialog("open")
        })

    }
    self.listGraphNodeTypes = function (ids, part14TopTypes, callback) {
        if (!ids || ids.length == 0)
            return;
        var sourceLabel = Lineage_classes.mainSource


        var strFrom = Sparql_common.getFromStr(sourceLabel, null, true, true)
        var query =
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\n" +
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>" +
            "SELECT distinct ?x ?type  " + strFrom + "  WHERE {\n"
        if (part14TopTypes) {
            query += "  ?x rdfs:subClassOf|rdf:type ?type.\n" +
                "  filter (regex(str(?type),\"part14\") && ?type !=  <http://standards.iso.org/iso/15926/part14/Thing>)\n"
        } else {
            query += "  ?x rdfs:subClassOf|rdf:type ?type.?type rdf:type ?typeType filter (?typeType not in (owl:Restriction)) " // filter (?type not in ( <http://souslesens.org/resource/vocabulary/TopConcept>,<http://www.w3.org/2002/07/owl#Class>))"
        }
        query += Sparql_common.setFilter("x", ids)


        query += "}"

        var sparql_url = Config.sources[sourceLabel].sparql_server.url;
        var url = sparql_url + "?format=json&query=";
        Sparql_proxy.querySPARQL_GET_proxy(url, query, "", {source: sourceLabel}, function (err, result) {
            if (err) {
                return callback(err)
            }

            return callback(null, result.results.bindings)


        })

    }
    self.colorNodesByPart14TopType = function () {
        self.colorGraphNodesByType(true)
    }
    self.colorGraphNodesByType = function (part14TopTypes) {

        var existingNodes = visjsGraph.getExistingIdsMap(true)
        var ids = Object.keys(existingNodes);
        self.listGraphNodeTypes(ids, part14TopTypes, function (err, result) {
            if (err)
                return alert(err)
            var nodesTypesMap = {}
            var colorsMap = {}
            var excludedTypes = ["TopConcept", "Class", "Restriction"]
            result.forEach(function (item) {
                var ok = true
                excludedTypes.forEach(function (type) {

                    if (item.type.value.indexOf(type) > -1)
                        return ok = false;
                })

                if (ok) {

                    if (!colorsMap[item.type.value]) {
                        colorsMap[item.type.value] = common.paletteIntense[Object.keys(colorsMap).length]
                    }
                    nodesTypesMap[item.x.value] = {type: item.type.value, color: colorsMap[item.type.value]}
                }
            })
            // console.log(JSON.stringify(nodesTypesMap, null, 2))
            var newNodes = []
            var neutralColor = "#ccc"
            var legendNodes = []
            for (var nodeId in existingNodes) {
                if (nodeId.indexOf("legend_") == 0)
                    legendNodes.push(nodeId)
                else {
                    var color = neutralColor;
                    if (nodesTypesMap[nodeId])
                        color = nodesTypesMap[nodeId].color
                    else
                        console.log(nodeId)

                    newNodes.push({id: nodeId, color: color})

                }
            }

            visjsGraph.data.nodes.remove(legendNodes)
            visjsGraph.data.nodes.update(newNodes)


            var legendNodes = []
            var str = ""
            for (var type in colorsMap) {
                str += "<div class='Lineage_legendTypeDiv' onclick='Lineage_decoration.onlegendTypeDivClick(\""+type+"\")' style='background-color:" + colorsMap[type] + "'>" + Sparql_common.getLabelFromURI(type) + "</div>"

            }
            $("#Lineage_classes_graphDecoration_legendDiv").html(str)
            //  visjsGraph.data.nodes.add(legendNodes)
        })


    }
    self.onlegendTypeDivClick=function(type){
        self.currentLegendType=type
    }


    return self;

})()