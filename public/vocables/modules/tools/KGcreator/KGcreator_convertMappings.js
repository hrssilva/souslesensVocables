import KGcreator from "./KGcreator.js";
import KGcreator_mappings from "./KGcreator_mappings.js";

var KGcreator_convertMappings = (function () {
  var self = {};
  var TRIPLES_HEADER = "triplesModel";
  var SUBJECT_HEADER = "s";
  var PREDICATE_HEADER = "p";
  var OBJECT_HEADER = "o";

  self.SKG_to_R2RML = function (SKG_json) {
    SKG_json[TRIPLES_HEADER].forEach(
      function(triple) {
        var subject = triple[SUBJECT_HEADER];
        var predicate = triple[PREDICATE_HEADER];
        var object = triple[OBJECT_HEADER];
      }
    );
    var mappings = {};
    return mappings;
  };

  self.R2RML_to_SKG = function (R2RML_ttl) {
    var mappings = {};
    return mappings;
  };
});
