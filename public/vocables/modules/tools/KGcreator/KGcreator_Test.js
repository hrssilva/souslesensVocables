import KGcreator_mappings from "./KGcreator_mappings.js";

var KGcreator_Test= (function () {
    self.teste=function(){
        let body={operationId:'query'};
        $.ajax({
            type: "POST",
            url: Config.apiUrl + '/jowl/ontop',
            dataType: 'json',
            data: body,
            success: function (result, _textStatus, _jqXHR) {
                self.mappingFiles = {};
                let queryEditor = document.getElementById("KGcreator_mappingsEditor");
                
                if (result == null) {
                    console.log("Resultado null");
                    queryEditor.innerText = "Resultado null";
                }
                else
                    KGcreator_mappings.showMappingsInEditor(result);
                    console.log(result);
                    queryEditor.innerText = JSON.stringify(result, null, 2);
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
window.KGcreator_Test=KGcreator_Test;