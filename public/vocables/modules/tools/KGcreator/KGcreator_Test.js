var KGcreator_Test= (function () {
    self.teste=function(){
        let body={operationId:'init_repo'};
        $.ajax({
            type: "POST",
            url: Config.apiUrl + '/jowl/ontop',
            dataType: 'json',
            data: body,
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
    }
    return self;
}
)();
export default KGcreator_Test;
Window.KGcreator_Test=KGcreator_Test;