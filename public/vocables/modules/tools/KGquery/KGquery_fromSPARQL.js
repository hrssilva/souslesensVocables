
var fromSPARQL = (function () {
    var self = {};

    self.test = function () {
        var loadData = { operationId:'query' };
        $.ajax({
            type: "POST",
            url: Config.apiUrl + '/jowl/ontop',
            dataType: 'json',
            data: loadData,
            success: function (result, _textStatus, _jqXHR) {
                self.mappingFiles = {};
                let queryEditor = document.getElementById("KGquery_queryEditor");
                if (result == null) {
                    self.result = null;
                    console.log("Null Result");
                    KGquery.message("Null Result");
                    queryEditor.innerText = "Null Result";
                }
                else{
                    self.result = result;
                    console.log(result);
                    queryEditor.innerText = JSON.stringify(result, null, 2);
                    KGquery.message("Repository not exists");
                }
            },
            error: function () {
                self.result = null;
                console.log("KGquery_fromSpaql_ajax_error!");
                KGquery.message("KGquery_fromSpaql_ajax_error!");
            },
        });

        if(self.result != null){
            self.jsonEditor = new JsonEditor("#KGquery_queryEditor", result);
            $("#KGquery_queryEditor").on("mouseup", function () {
                var selection = self.getTextSelection();
                if (selection) {
                    self.currentMappingsSelection = selection;
                }
            });
        }
    };

    self.getTextSelection = function () {
        var t;
        if (window.getSelection) {
            t = window.getSelection().toString();
        } else if (document.getSelection) {
            t = document.getSelection().toString();
        } else if (document.selection) {
            t = document.selection.createRange().text;
        }
        return t;
    };

    return self;
})();

export default fromSPARQL;
window.fromSPARQL = fromSPARQL;