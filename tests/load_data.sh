#! /bin/bash

BFO_DATA_URL="https://raw.githubusercontent.com/BFO-ontology/BFO/v2019-08-26/bfo_classes_only.owl"

# Load test data into Virtuoso
docker-compose -f docker-compose.test.yaml exec -T virtuoso isql-v -U dba -P dba  <<EOF
    ld_dir('dumps', 'bfo_classes_only.owl', 'http://purl.obolibrary.org/obo/bfo.owl');
    ld_dir('dumps', '22-rdf-syntax-ns', 'https://www.w3.org/1999/02/22-rdf-syntax-ns');
    ld_dir('dumps', 'rdf-schema', 'https://www.w3.org/2000/01/rdf-schema');
    ld_dir('dumps', 'owl', 'https://www.w3.org/2002/07/owl');
    ld_dir('dumps', 'AnnotationVocabulary.rdf', 'https://spec.industrialontologies.org/ontology/core/meta/AnnotationVocabulary/');
    rdf_loader_run();
    exit;
EOF
