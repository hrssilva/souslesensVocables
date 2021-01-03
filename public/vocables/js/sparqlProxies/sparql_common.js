var Sparql_common = (function () {


    var self = {};

    self.setFilter = function (varName, ids, words, options) {
        function formatWord(str) {
            var str = str.replace(/\\/g, "")
            str = str.replace(/\(/gm, "")
            str = str.replace(/\)/gm, "")
            str = str.replace(/\[/gm, "")
            str = str.replace(/\]/gm, "")

            return str
        }


        if (!options)
            options = {}
        var filter = ";"
        if (words) {
            if (Array.isArray(words)) {
                var conceptWordStr = ""
                words.forEach(function (word, index) {
                    if(word.length>2) {
                        if (conceptWordStr != "")
                            conceptWordStr += "|"
                        if (options.exactMatch)
                            conceptWordStr += "^" + formatWord(word) + "$";
                        else
                            conceptWordStr += "" + formatWord(word) + "";
                    }
                })
                filter = " filter( regex(?" + varName + "Label , \"" + conceptWordStr + "\",\"i\")) ";
            } else {
                var filter = "  filter( regex(?" + varName + "Label, \"^" + words + "$\", \"i\"))";
                if (!options.exactMatch) {
                    filter = " filter( regex(?" + varName + "Label, \"" + words + "\", \"i\"))";

                }
            }
        } else if (ids) {
            if (Array.isArray(ids)) {
                var conceptIdsStr = ""
                ids.forEach(function (id, index) {
                    if(id!="") {
                        if (conceptIdsStr!="")
                            conceptIdsStr += ","
                        conceptIdsStr += "<" + id + ">"
                    }
                })

                filter = "filter(  ?" + varName + " in( " + conceptIdsStr + "))";
            } else {
                filter = " filter( ?" + varName + " =<" + ids + ">)";
            }

        } else {
            return "";
        }
        return filter;
    }


    self.getUriFilter = function(varName, uri) {
        var filterStr = ""
        if (Array.isArray(uri)) {
            var str = ""
            uri.forEach(function (item, index) {
                if (index > 0)
                    str += ","
                str += "<" + item + ">"
            })
            filterStr = "filter (?" + varName + " in (" + str + "))"

        } else {
            filterStr += "filter( ?" + varName + "=<" + uri + ">)."
        }
        return filterStr;
    }


    self.formatString = function (str, forUri) {
        if (!str || !str.replace)
            return null;

        str = str.replace(/&/gm, "and")
        str = str.replace(/'/gm, " ")
        str = str.replace(/\\/gm, "")
        //  str = str.replace(//gm, ".")
        //  str = str.replace(/\r/gm, "")
        //  str = str.replace(/\t/gm, " ")
        // str = str.replace(/\(/gm, "-")
        //  str = str.replace(/\)/gm, "-")
        str = str.replace(/\\xa0/gm, " ")


        return unescape(encodeURIComponent(str));


        if (forUri)
            str = str.replace(/ /gm, "_")


        return str;
    }


    self.formatUrl = function (str) {
        str = str.replace(/%\d*/gm, "_")
        return str;
    }


    return self;


})()
