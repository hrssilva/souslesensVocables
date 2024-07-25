
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
                if (result == null) {
                    console.log("Resultado null");
                }
                else
                    console.log(result);
            },
            error: function () {
                console.log("Erro!");
            },
        });
    };

    return self;
})();

export default fromSPARQL;
window.fromSPARQL = fromSPARQL;