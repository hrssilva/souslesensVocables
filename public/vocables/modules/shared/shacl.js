var Shacl = (function () {
    var self = {};

    self.prefixMap = {
        ido: "http://rds.posccaesar.org/ontology/lis14/rdl/",
        dash: "http://datashapes.org/dash#",
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        sh: "http://www.w3.org/ns/shacl#",
    };
    self.getPrefixes = function () {
        var prefixes = "";
        for (var prefix in self.prefixMap) {
            prefixes += "@prefix " + prefix + ": <" + self.prefixMap[prefix] + ">.\n";
        }
        return prefixes;
    };

    self.initSourceLabelPrefixes = function (sourceLabel) {
        self.prefixMap[Config.sources[sourceLabel].prefix] = Config.sources[sourceLabel].graphUri;
    };

    self.uriToPrefixedUri = function (uri) {
        var p = uri.lastIndexOf("#");
        if (p < 0) {
            p = uri.lastIndexOf("/");
        }
        if (p < 0) {
            return uri;
        }

        var prefix2 = uri.substring(0, p + 1);
        var suffix = uri.substring(p + 1);

        for (var prefix in self.prefixMap) {
            if (self.prefixMap[prefix] == prefix2) {
                return prefix + ":" + suffix;
            }
        }
        var prefixId = "ns" + Object.keys(self.prefixMap).length;
        self.prefixMap[prefixId] = prefix2;
        return prefixId + ":" + suffix;
    };

    self.getShacl = function (sourceClassUri, targetClassUri, shaclProperties) {
        var shacl = "";
        shacl += sourceClassUri + "\n" + "    a sh:NodeShape ;\n";
        if (targetClassUri) {
            shacl += "    sh:self.targetClass  " + self.uriToPrefixedUri(targetClassUri) + ";\n";
        }
        shaclProperties.forEach(function (property, index) {
            shacl += "  sh:property [\n" + property + "]";
            if (index == shaclProperties.length - 1) {
                shacl += ".\n";
            } else {
                shacl += ";\n";
            }
        });
        return shacl;
    };

    return self;
})();

export default Shacl;
window.Shacl = Shacl;
