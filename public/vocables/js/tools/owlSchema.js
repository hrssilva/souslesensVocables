var OwlSchema = (function () {
    var self = {}
    self.currentSourceSchema = null;


    self.setLabelsFromQueryResult = function (bindings) {

        bindings.forEach(function (item) {
            for (var key in item) {
                var p = key.indexOf("Label")
                if (p > -1) {
                    var idKey = key.substring(0, p)
                    if (item[idKey]) {
                        self.currentSourceSchema.labelsMap[item[idKey].value] = item[key].value
                    }
                }
            }
        })
    }

    self.initSourceSchema = function (sourceLabel, callback) {
        async.series([
            // load schema sconfig
            function (callbackSeries) {
                if (self.schemasConfig)
                    return callbackSeries();


                $.getJSON("config/schemas.json", function (json) {
                    self.schemasConfig = json;
                    if (Config.sources[sourceLabel].schema) {
                        self.currentSourceSchema = self.schemasConfig[Config.sources[sourceLabel].schema]

                    } else {// default SKOS
                        self.currentSourceSchema = {
                            sparql_url: Config.sources[sourceLabel].sparql_server.url,
                            graphUri: Config.sources[sourceLabel].graphUri,
                        }
                    }
                    self.currentSourceSchema.classes = {}
                    self.currentSourceSchema.labelsMap = {}
                    return callbackSeries();
                })


            },

        ], function (err) {
            callback(err)
        })
    }


    self.getClassDescription = function (sourceLabel, classId, callback) {
        async.series([
                // load schema if not
                function (callbackSeries) {

                    if (self.currentSourceSchema)
                        return callbackSeries();
                    self.initSourceSchema(sourceLabel, function (err, result) {
                        if (err)
                            return MainController.UI.message(err)

                        callbackSeries(err);
                    })
                }
                ,
                //check if classType already loaded
                function (callbackSeries) {
                    if (self.currentSourceSchema.classes[classId])
                        return callback(self.currentSourceSchema.classes[classId]);
                    return callbackSeries()
                },
                // load classes
                function (callbackSeries) {
                    Sparql_schema.getClasses(self.currentSourceSchema, classId, function (err, result) {
                        if (err)
                            return callbackSeries(err);
                        self.setLabelsFromQueryResult(result)

                        result.forEach(function (item) {
                            self.currentSourceSchema.classes[item.class.value] = {id: item.class.value, label: common.getItemLabel(item, "class"), objectProperties: {}, annotations: {}}
                        })
                        return callbackSeries();
                    })
                }
                ,
                // load object properties
                function (callbackSeries) {
                    Sparql_schema.getClassProperties(self.currentSourceSchema, classId, function (err, result) {

                        if (err)
                            return callbackSeries(err)
                        self.setLabelsFromQueryResult(result)
                        result.forEach(function (item) {
                            if (item.subProperty)
                                self.currentSourceSchema.classes[classId].objectProperties[item.subProperty.value] = {id: item.subProperty.value, label: common.getItemLabel(item, "subProperty")}
                            else
                                self.currentSourceSchema.classes[classId].objectProperties[item.property.value] = {id: item.property.value, label: common.getItemLabel(item, "property")}

                        })

                        callbackSeries();
                    })
                }
                // load annotations
                ,
                function (callbackSeries) {
                    Sparql_schema.getObjectAnnotations(self.currentSourceSchema, classId, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        self.setLabelsFromQueryResult(result)
                        result.forEach(function (item) {
                            self.currentSourceSchema.classes[classId].annotations[item.annotation.value] = {id: item.annotation.value, label: common.getItemLabel(item, "annotation")}
                        })

                        callbackSeries();
                    })
                },
                function (callbackSeries) {
                    var properties = Object.keys(self.currentSourceSchema.classes[classId].objectProperties)
                    Sparql_schema.getPropertiesRangeAndDomain(self.currentSourceSchema, properties, function (err, result) {
                        if (err)
                            return callbackSeries(err)
                        self.setLabelsFromQueryResult(result)
                        result.forEach(function (item) {
                            self.currentSourceSchema.classes[classId].objectProperties[item.property.value].range = item.range.value
                            self.currentSourceSchema.classes[classId].objectProperties[item.property.value].domain = item.domain.value


                        })
                        callbackSeries();

                    })
                }
            ],
            function (err) {
                callback(err, self.currentSourceSchema.classes[classId])

            }
        )
    }


    return self
})()