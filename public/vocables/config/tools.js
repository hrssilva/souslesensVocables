self.tools = {};

self.tools["sourceBrowser"] = {
    label: "Browse",
    multiSources: 0,
    controller: SourceBrowser,
    toolDescriptionImg: null,
}; //"images/browse.png"}
//  self.tools["sourceEditor"] = {label: "Edit", multiSources: 0, controller: SourceEditor,toolDescriptionImg:null},
self.tools["sourceMatcher"] = {
    label: "Match",
    multiSources: 0,
    controller: SourceMatcher,
    toolDescriptionImg: null,
}; //"images/match.png"}
self.tools["evaluate"] = { label: "Evaluate", noSource: 1, controller: Evaluate, toolDescriptionImg: null }; //"images/evaluate.png"}
self.tools["ancestors"] = { label: "Genealogy", multiSources: 1, controller: Genealogy, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["lineage"] = { label: "Lineage", noSource: 0, controller: Lineage_classes, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["KGmappings"] = {
    label: "KGmappings",
    multiSources: 0,
    controller: KGmappings,
    toolDescriptionImg: null,
};

self.tools["Standardizer"] = {
    label: "Standardizer",
    multiSources: 0,
    controller: Standardizer,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}

self.tools["TSF_Dictionary"] = {
    label: "TSF_Dictionary",
    noSource: 1,
    controller: Lineage_dictionary,
    toolDescriptionImg: null,
};

self.tools["KGcreator"] = {
    label: "KGcreator",
    noSource: 1,
    controller: KGcreator,
    toolDescriptionImg: null,
};

self.tools["KGbrowser"] = { label: "KGbrowser", multiSources: 0, controller: KGbrowser, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["KGpropertyFilter"] = {
    label: "KGpropertyFilter",
    noSource: 1,
    controller: KGpropertyFilter,
    toolDescriptionImg: null,
};

self.tools["TE_14224_browser"] = {
    label: "TE_14224_browser",
    multiSources: 0,
    noSource: true,
    controller: TE_14224_browser,
    toolDescriptionImg: null,
};

self.tools["TE_AssetConfigurator"] = {
    label: "TE_AssetConfigurator",
    multiSources: 0,
    noSource: true,
    controller: TE_AssetConfigurator,
    toolDescriptionImg: null,
};
self.tools["SQLquery"] = {
    label: "SQLquery",
    multiSources: 0,
    controller: SQLquery,
    toolDescriptionImg: null,
}; //"images/taxonomy.png"}

self.tools["SPARQL"] = {
    label: "SPARQL endpoint",
    multiSources: 0,
    controller: SPARQL_endpoint,
    toolDescriptionImg: null,
};

self.tools["admin"] = { label: "Admin", multiSources: 1, controller: Admin, toolDescriptionImg: null }; //"images/taxonomy.png"}

self.tools["ConfigEditor"] = {
    label: "ConfigEditor",
    noSource: 1,
    controller: ConfigEditor,
    toolDescriptionImg: null,
};

Config.tools = self.tools;