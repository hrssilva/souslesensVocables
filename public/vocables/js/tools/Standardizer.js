var Standardizer = (function () {
    var self = {};
    self.matchCandidates = {}
    var matrixHtml = ""

    self.onLoaded = function () {
        //    self.selectedSources = $("#sourcesTreeDiv").jstree(true).get_checked()
        $("#actionDiv").html("")
        $("#actionDivContolPanelDiv").load("snippets/standardizer/standardizer_left.html")
        self.mode = "matrix"

        if (self.mode == "normal") {
            $("#graphDiv").load("snippets/standardizer/standardizer_central.html")

        }
        if (self.mode == "matrix") {
            $("#graphDiv").load("snippets/standardizer/standardizer_centralMatrix.html")

        }


        $("#graphDiv").load("snippets/standardizer/standardizer_centralMatrix.html")
        $("#accordion").accordion("option", {active: 2});
        setTimeout(function () {
            var w = $(document).width() - leftPanelWidth - 30;
            var h = $(document).height() - 20;

            self.initSourcesIndexesList(null, function (err, sources) {
                if (err)
                    return MainController.UI.message(err)
                MainController.UI.showSources("KGMappingAdvancedMappings_sourcesTree", true, sources);
                sources.sort()

                var candidateEntities = sources
                candidateEntities.splice(0, 0, "all")
                common.fillSelectOptions("KGadvancedMapping_filterCandidateMappingsSelect", candidateEntities, false)


                var sortList = ["alphabetic", "candidates"]
                sources.forEach(function (source) {
                    sortList.push({value: "_search_" + source, text: source})
                })


                common.fillSelectOptions("KGmapping_distinctColumnSortSelect", sortList, false, "text", "value")
                KGadvancedMapping.setAsMatchCandidateExternalFn = Standardizer.setAsMatchCandidate

                common.fillSelectOptions("Standardizer_sourcesSelect", sources, true);


            })
            self.matchCandidates = {}
        }, 200)
    }


    self.initSourcesIndexesList = function (options, callback) {
        if (!options)
            options = {}
        var payload = {
            dictionaries_listIndexes: 1,

        }
        $.ajax({
            type: "POST",
            url: Config.serverUrl,
            data: payload,
            dataType: "json",
            success: function (indexes, textStatus, jqXHR) {
                var sources = [];

                for (var source in Config.sources) {
                    if (options.schemaType && Config.sources[source].schemaType != options.schemaType) {
                        ;
                    } else {

                        indexes.forEach(function (index) {
                            if (index == source.toLowerCase())
                                sources.push(source);

                        })
                    }
                }
                return callback(null, sources)


            }
            , error: function (err) {
                return callback(err);

            }


        })


    }


    self.getElasticSearchExactMatches = function (words, indexes, from, size, callback) {

        var mode = $("#KGadvancedMapping_queryTypeSelect").val()
        $("#waitImg").css("display", "block")
        //   MainController.UI.message("Searching exact matches ")
        KGadvancedMapping.currentColumnValueDivIds = {}


        var entitiesMap = {};
        var count = 0

        self.getWordBulkQuery = function (word, mode, indexes) {

            var queryObj;
            if (!mode || mode == "exactMatch") {
                queryObj = {
                    "bool": {
                        "must": [
                            {
                                "term": {
                                    "label.keyword": word.toLowerCase(),

                                }
                            }
                        ]
                    }
                }
            } else {
                queryObj = {

                    "bool": {
                        "must": [
                            {
                                "query_string": {
                                    "query": word,
                                    "default_field": "label",
                                    "default_operator": "OR"
                                }
                            }
                        ]

                    }

                }
            }
            var header = {"index": indexes}


            var query = {
                "query": queryObj,
                "from": from,
                "size": size,
                "_source": {
                    "excludes": [
                        "attachment.content"
                    ]
                },
            }
            var str = JSON.stringify(header) + "\r\n" + JSON.stringify(query) + "\r\n";
            return str;

        }


        self.entitiesMap = {}
        var bulQueryStr = ""
        var slices = common.array.slice(words, 100)
        var allResults = []
        var totalProcessed = 0
        async.eachSeries(slices, function (wordSlice, callbackEach) {
            bulQueryStr="";
            wordSlice.forEach(function (word) {
                var wordQuery = self.getWordBulkQuery(word, mode, indexes)
                bulQueryStr += wordQuery;
            })
            ElasticSearchProxy.executeMsearch(bulQueryStr, function (err, result) {
                if (err)
                    return callbackEach(err)

                allResults = allResults.concat(result)
                callbackEach();
            })


        }, function (err) {
            callback(err, allResults);

        })
    }
    self.getClassesLabels = function (classUris, indexes, callback) {

        var bulQueryStr = ""
        var slices = common.array.slice(classUris, 100)
        var allResults = []
        var totalProcessed = 0
        var size = 200
       var  queryResultsSize=5000
        var classesMap = {}
        var  slices;
        if(classUris)
       slices = common.array.slice(classUris, size)
        async.eachSeries(slices, function (urisSlice, callbackEach) {
                var queryObj = {
                    "terms": {
                        "id.keyword": urisSlice,
                    }
                }
                var query = {
                    "query": queryObj,
                    "from": 0,
                    "size": queryResultsSize,
                    "_source": {
                        "excludes": [
                            "attachment.content",
                            "parents"
                        ]
                    },
                }


            ElasticSearchProxy.queryElastic(query,indexes, function (err, result) {
                if (err)
                    return callbackEach(err)

                var hits=result.hits.hits
if(hits.length>queryResultsSize)
    if(!confirm("resut troncated > "+hits.length))
        return callback("resut troncated")
                hits.forEach(function(hit){
                    classesMap[hit._source.id]=hit._source.label
                })
                callbackEach();
            })
        }, function (err) {
            if (err)
                return callback(err);
            return callback(null, classesMap)
        })

    }

    self.getSelectedIndexes = function () {
        var sources = $('#KGMappingAdvancedMappings_sourcesTree').jstree(true).get_checked();
        var indexes = []
        var sourceIndex = $("#Standardizer_sourcesSelect").val();

        sources.forEach(function (source) {
            if (!Config.sources[source] || !Config.sources[source].schemaType)
                return;
            if (source != sourceIndex)
                indexes.push(source.toLowerCase())
        })
        return indexes;
    }

    self.initMatrix = function (indexes) {    //titre des colonnes
        var html = "<div class='matrix'>"
        html += "<div class='matrixRow'>"
        html += "<div class='matrixRowTitle'></div>"
        indexes.forEach(function (index) {
            html += "<div class='matrixColTitle'>" + index + "&nbsp;&nbsp;</div>"
        })
        html += "<div style='width:50px'></div>"
        html += "</div>"

        return html;
    }

    self.processResult = function (words, data, indexes) {
        var entitiesMap = []
        words.forEach(function (word, index) {
            if (!entitiesMap[word]) {
                entitiesMap[word] = []
            }
            if (!data[index] || !data[index].hits)
                return;
            var hits = data[index].hits.hits


            hits.forEach(function (hit) {

                var entity = {
                    index: hit._index,
                    id: hit._source.id,
                    score: hit._score,
                    label: hit._source.label,
                    status: "exactMatch"
                }

                entitiesMap[word][entity.index] = entity
            })
        })


        if (self.mode == "normal") {

            KGadvancedMapping.currentColumnValueDivIds = {}
            var distinctSources = []
            words.forEach(function (word) {
                word = word.toLowerCase().trim()
                var sourcesHtml = ""
                var id = "columnValue" + common.getRandomHexaId(5)
                KGadvancedMapping.currentColumnValueDivIds[id] = {value: word, sources: [], indexData: []}
                var cssClass;


                if (entitiesMap[word]) {//exact match


                    cssClass = "KGmapping_columnValues_referenceValue"
                    for (var index in entitiesMap[word]) {
                        KGadvancedMapping.currentColumnValueDivIds[id].indexData.push(entitiesMap[word])
                        KGadvancedMapping.currentColumnValueDivIds[id].sources.push(index)

                        if (index && distinctSources.indexOf(index) < 0)
                            distinctSources.push(index)
                        sourcesHtml += "&nbsp;<span class='KGmapping_distinctColumnValueSource' style='background-color:" + KGadvancedMapping.getSourceColor(index) + "'>" + index + "</span>";

                    }
                } else {
                    cssClass = "KGmapping_columnValues_hasCandidateValues"
                }


                if (cssClass && cssClass != "") {
                    $("#KGmapping_columnValues option[value='" + word + "']").addClass(cssClass);

                }

                var html = "<div onclick='Standardizer.editCandidateValues(\"" + id + "\")' id='" + id + "' class='KGmapping_columnValue " + cssClass + "'>" + word + sourcesHtml + "</div>";
                $("#KGmapping_matrixContainer").append(html)


            })
        } else if (self.mode == "matrix") {
            var html = ""

            for (var word in entitiesMap) {

                var cellHtml = ""
                var hasMatchesClass = false


                indexes.forEach(function (indexName) {
                    var cellStr = ""
                    var specificClassStr = ""
                    var divId = common.getRandomHexaId(10)
                    self.matrixDivsMap[divId] = {index: indexName}


                    //     self.matrixIndexRankingsMap[divId]={index:indexName}
                    if (entitiesMap[word][indexName]) {
                        hasMatchesClass = true
                        cellStr = " "
                        specificClassStr = "matrixCellExactMatch"
                        self.matrixDivsMap[divId] = entitiesMap[word][indexName]

                        if (!self.matrixIndexRankingsMap)
                            self.matrixIndexRankingsMap = {}
                        if (!self.matrixIndexRankingsMap[indexName])
                            self.matrixIndexRankingsMap[indexName] = 0
                        self.matrixIndexRankingsMap[indexName] += 1

                    }
                    self.matrixDivsMap[divId].word = word
                    // self.matrixDivsMap[divId].index=indexName


                    cellHtml += "<div id='" + divId + "' class='matrixCell " + specificClassStr + "' >" + cellStr + "</div>"


                })

                var rowHtml = "<div class='matrixRow'>"

                var hasMatchesClassStr = ""
                if (!hasMatchesClass)
                    hasMatchesClassStr = " matrixWordNoMatch"
                rowHtml += "<div class='matrixRowTitle " + hasMatchesClassStr + "'>" + word + "</div>"
                rowHtml += cellHtml + "</div>"
                html += rowHtml;

            }
            return html;


        }


    }

    self.getMatchesClassesByIndex = function (bulkResult) {
        var indexClassMap = {}
        bulkResult.forEach(function (item) {
            var hits = item.hits.hits;
            hits.forEach(function (hit) {
                if (!indexClassMap[hit._index])
                    indexClassMap[hit._index] = {}
                if (!indexClassMap[hit._index][hit._source.id])
                    indexClassMap[hit._index][hit._source.id] = {words: [], data: hit._source}
                indexClassMap[hit._index][hit._source.id].words.push(hit._source.label)
            })
        })
        return indexClassMap;
    }

    self.showMatchesIndexRanking = function () {
        if (!self.matrixIndexRankingsMap)
            return;
        var array = []
        for (var index in self.matrixIndexRankingsMap) {
            array.push({index: index, count: self.matrixIndexRankingsMap[index]})
        }

        array.sort(function (a, b) {

            return b.count - a.count;
        })
        var html = "<B>Sources ranking</B><br><table>"
        array.forEach(function (item) {
            html += "<tr><td>" + item.index + "</td><td> " + item.count + "</td></tr>"
        })
        html += "</table>"

        $("#Standardizer_matrixRankingDiv").html(html)


    }
    self.compareWordsList = function () {

        $("#KGmapping_matrixContainer").html("")
        var text = $("#Standardizer_wordsTA").val()
        if (text == "")
            return alert("Enter text to standardize")
        var words = text.split("\n")
        words.forEach(function (word) {
            word = word.trim()
        })
        self.matrixDivsMap = {}
        var resultSize = 1
        var size = 200;
        var totalProcessed = 0
        var indexes = self.getSelectedIndexes()
        if (indexes.length == 0)
            return alert("select target Source of comparison")
        var html = self.initMatrix(indexes)
        $("#KGmapping_matrixContainer").html(html)

        var slices = common.array.slice(words, size)
        async.eachSeries(slices, function (words, callbackEach) {
            var indexes = self.getSelectedIndexes()
            self.getElasticSearchExactMatches(words, indexes, 0, words.length, function (err, result) {
                var html = self.processResult(words, result, indexes)
                MainController.UI.message(" processed items: " + (totalProcessed++))
                $("#KGmapping_matrixContainer").append(html)
                totalProcessed += result;
                callbackEach()
            })


        }, function (err) {
            self.isWorking = null;
            if (err)
                return alert(err)
            MainController.UI.message("DONE, total processed items: " + (totalProcessed++))
            setTimeout(function () {
                $(".matrixCell").bind("click", Standardizer.onMatrixCellClick)
                self.showMatchesIndexRanking()

            }, 500)
        })
    }


    self.compareSource = function () {
        if (self.isWorking)
            return alert(" busy !")
        self.matrixDivsMap = {}
        var source = $("#Standardizer_sourcesSelect").val();
        if (!source || source == "")
            return alert("select a source");
        var index = source.toLowerCase()
        var resultSize = 1
        var size = 200;
        var from = offset;
        var offset = 0
        var totalProcessed = 0
        var indexes = self.getSelectedIndexes()
        var p = indexes.indexOf(source.toLowerCase())
        if (p > -1)// remove source from indexes to compare with
            indexes.splice(p, 1)
        if (indexes.length == 0)
            return alert("select target Source of comparison")
        var html = self.initMatrix(indexes)
        $("#KGmapping_matrixContainer").html(html)
        async.whilst(function (test) {
            return resultSize > 0

        }, function (callbackWhilst) {

            self.listSourceLabels(index, offset, size, function (err, hits) {
                if (err)
                    return callbackWhilst(err)
                resultSize = hits.length
                var words = []
                offset += size
                hits.forEach(function (hit) {
                    words.push(hit._source.label);
                })
                var indexes = self.getSelectedIndexes()
                self.getElasticSearchExactMatches(words, indexes, 0, size, function (err, result) {
                    if (err)
                        return alert(err)
                    //  self.getMatchesClassesByIndex(result)
                    var html = self.processResult(words, result, indexes)
                    totalProcessed += result.length;
                    MainController.UI.message(" processed items: " + (totalProcessed))
                    $("#KGmapping_matrixContainer").append(html)

                    callbackWhilst()
                })


            })
        }, function (err) {
            self.isWorking = null;
            if (err)
                return alert(err)
            MainController.UI.message("DONE, total processed items: " + (totalProcessed++))
            setTimeout(function () {
                $(".matrixCell").bind("click", Standardizer.onMatrixCellClick)
                self.showMatchesIndexRanking()

            }, 500)
        })
    }


    self.onMatrixCellClick = function (event) {
        var cellData = self.matrixDivsMap[this.id]
        self.editCellData(cellData)
    }

    self.editCellData = function (cellData) {
        var html = "<b>" + cellData.index + "</b>"

        html += "<br><table>"

        for (var key in cellData) {
            var value = "" + cellData[key]
            if (value.indexOf("http://") == 0)
                value = "<a target='_blank' href='" + value + "'>" + value + "</a>"
            html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>"
        }
        html += "</table>" +
            "<br>"
        $("#Standardizer_matrixCellDataDiv").html(html)
        MainController.UI.message("", true)

    }

    self.editCandidateValues = function (columnValueDivId, searchedText) {
        KGadvancedMapping.currentColumnValueDivId = columnValueDivId
        var columnValue = KGadvancedMapping.currentColumnValueDivIds[columnValueDivId].value
        $("#KGadvancedMapping_searchEntitiesInput").val(columnValue)
        var entity = self.entitiesMap[columnValue.toLowerCase()]
        if (entity) {
            var keys = []

            for (var source in entity) {
                if (keys.length == 0)
                    keys = Object.keys(entity[source])
            }

            var html = ""
            for (var source in entity) {
                html += "<b>" + source + "</b>"

                html += "<br><table>"

                keys.forEach(function (key) {
                    var value = "" + entity[source][key]
                    if (value.indexOf("http://") == 0)
                        value = "<a href='" + value + "'>" + value + "</a>"
                    html += "<tr><td>" + key + "</td><td>" + value + "</td></tr>"
                })
                html += "</table>" +
                    "<br>"

                if (authentication.currentUser.groupes.indexOf("admin") > -1) {
                    html += "<button  onclick='Standardizer.removeAsReference(\"" + entity[source].id + "\")' >Remove</button>"
                    if (entity[source].status == "CANDIDATE")
                        html += "<button  onclick='Standardizer.setAsReference(\"" + entity[source].id + "\")' >Validate</button>"
                }
                html += "<hr>"

            }

            $("#KGadvancedMapping_dictionaryMappingContainerDiv").html(html)
            MainController.UI.message("", true)

        } else {

            KGadvancedMapping.searchEntities(columnValue,)
        }
    }

    self.setAsReference = function (referenceId) {

    }
    self.removeAsReference = function (referenceId) {

    }


    self.exportMappings = function () {
        var columns = []
        var sourcesMap = {}
        var exportAncestors = $("#Standardizer_exportAncestorsCBX").prop("checked")

        for (var term in self.entitiesMap) {
            for (var index in self.entitiesMap[term]) {
                var item = {
                    target: self.entitiesMap[term][index],
                    term: term
                }

                var source = Config.Standardizer.elasticIndexesSourcesMap[index]

                if (!sourcesMap[source])
                    sourcesMap[source] = []
                sourcesMap[source].push(item)
            }
        }


        for (var columnValueDivId in KGadvancedMapping.matchCandidates) {

            var item = KGadvancedMapping.matchCandidates[columnValueDivId];
            item.target.status = "similar"
            var source = Config.Standardizer.elasticIndexesSourcesMap[item.target.index]
            if (!sourcesMap[source])
                sourcesMap[source] = []
            sourcesMap[source].push(item)

        }

        var sources = Object.keys(sourcesMap)
        var idsMap = {};
        async.eachSeries(sources, function (source, callbackEachSource) {

            var items = sourcesMap[source]

            items.forEach(function (item) {
                idsMap[item.target.id] = item;
            })


            if (!exportAncestors)
                return callbackEachSource();

            var ids = Object.keys(idsMap)
            var ancestorsDepth = 4
            var datatableColumns = []
            var dataTableData = []
            $("#waitImg").css("display", "block")
            MainController.UI.message("searching, classes ancestors in source " + source)
            Sparql_OWL.getNodeParents(source, null, ids, ancestorsDepth, null, function (err, result) {
                if (err)
                    return callbackEachSource(err)
                result.forEach(function (item2) {
                    var strBroaderLabels = ""
                    var strBroaderUris = ""
                    for (var i = 1; i < ancestorsDepth; i++) {
                        if (item2["broader" + i]) {
                            var broaderId = item2["broader" + i].value;
                            var broaderLabel = item2["broader" + i + "Label"].value;
                            strBroaderUris += broaderId + "/"
                            strBroaderLabels += broaderLabel + "/"

                        }

                    }
                    idsMap[item2.concept.value].superClassUris = strBroaderUris
                    idsMap[item2.concept.value].superClassLabels = strBroaderLabels
                })

                callbackEachSource();
            })


        }, function (err) {
            MainController.UI.message("building table",)
            var keys = ['term', 'status', 'index', 'classLabel', 'classId', 'score']
            if (exportAncestors) {
                keys.push('superClassUris')
                keys.push('superClassLabels')
            }
            var cols = [];
            var dataSet = [];
            keys.forEach(function (key) {
                cols.push({title: key, "defaultContent": ""})
            })


            for (var id in idsMap) {
                var line = [];
                var item = idsMap[id];
                line.push(item.term)
                line.push(item.target.status)
                line.push(item.target.index)
                line.push(item.target.label || item.target.term)
                line.push(item.target.id)
                line.push(item.target.score)
                if (exportAncestors) {
                    line.push(item.superClassUris)
                    line.push(item.superClassLabels)
                }
                dataSet.push(line)

            }


            $('#mainDialogDiv').dialog("open")

            $('#mainDialogDiv').html("<table id='dataTableDiv'></table>");
            setTimeout(function () {
                MainController.UI.message("", true)
                $('#dataTableDiv').DataTable({
                    data: dataSet,
                    columns: cols,
                    // async: false,
                    "pageLength": 15,
                    dom: 'Bfrtip',
                    buttons: [
                        'copy', 'csv', 'excel', 'pdf', 'print'
                    ]


                })
                    , 500
            })

        })

    }

    self.listSourceLabels = function (source, from, size, callback) {
        if (!from)
            from = 0
        if (!size)
            size = 1000
        if (!source) {
            source = $("#Standardizer_sourcesSelect").val();
            if (!source || source == "")
                return alert("select a source");
        }


        var queryObj = {"match_all": {}}


        var query = {
            "query": queryObj,
            "from": from,
            "size": size,
            "_source": {
                "excludes": [
                    "attachment.content"
                ]
            }
            , "sort": {
                "label": {"order": "asc"}
            }
        }

        var index = source.toLowerCase()
        ElasticSearchProxy.queryElastic(query, index, function (err, result) {


            if (callback) {
                return callback(err, result.hits.hits)
            } else {

                if (err)
                    return alert(err)
                var str = ""
                if (!result.hits)
                    return alert(JSON.stringify(result, null, 2))
                result.hits.hits.forEach(function (hit) {
                    str += hit._source.label + "\n";

                })

                $("#Standardizer_wordsTA").val(str)
            }
        })
    }


    self.generateSourceDictionary = function (sourceLabel) {
        if (Config.sources[sourceLabel].schemaType == "OWL") {
            Sparql_OWL.getDictionary(sourceLabel, {}, null, function (err, result) {
                if (err)
                    MainController.UI.message(err, true)

            })
        }
    }

    self.generateElasticIndex = function (sourceLabel, callback) {
        var totalLines = 0


        var processor = function (data, replaceIndex, callback) {


            if (data.length == 0)
                return callback();
            //  MainController.UI.message("indexing " + data.length)
            var options = {replaceIndex: replaceIndex}
            var payload = {
                dictionaries_indexSource: 1,
                indexName: sourceLabel.toLowerCase(),
                data: JSON.stringify(data),
                options: JSON.stringify(options)
            }

            $.ajax({
                type: "POST",
                url: Config.serverUrl,
                data: payload,
                dataType: "json",
                success: function (data2, textStatus, jqXHR) {
                    totalLines += data.length
                    MainController.UI.message("indexed " + totalLines + " in index " + sourceLabel.toLowerCase())
                    callback(null, data)
                }
                , error: function (err) {
                    callback(err);

                }


            })

        }

        if (Config.sources[sourceLabel].schemaType == "OWL") {
            Sparql_OWL.getSourceTaxonomyAnClasses(sourceLabel, null, function (err, result) {

                if (err) {
                    if (callback)
                        return callback(err);
                    MainController.UI.message(err, true)
                }
                var index = 0
                var classesArray = [];
                for (var key in result.classesMap) {
                    classesArray.push(result.classesMap[key])
                }
                var slices = common.array.slice(classesArray, 200)
                async.eachSeries(slices, function (data, callbackEach) {
                    var replaceIndex = false
                    if ((index++) == 0)
                        replaceIndex = true;
                    processor(data, replaceIndex, function (err, result) {
                        if (err)
                            return callbackEach(err)
                        //   MainController.UI.message("indexed "+data.length+" lines in "+sourceLabel)
                        callbackEach();
                    })
                }, function (err) {
                    if (callback)
                        return callback(err);
                    MainController.UI.message("DONE " + sourceLabel, true)
                })

            })

            return;
            Sparql_OWL.getDictionary(sourceLabel, {}, processor, function (err, result) {
                if (err) {

                    if (callback)
                        return callback(err);
                    MainController.UI.message(err, true)
                }


                if (callback)
                    return callback();
                MainController.UI.message("DONE " + sourceLabel, true)
            })
        }
    }


    return self;


})
()