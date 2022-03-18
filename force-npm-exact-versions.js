#!/usr/bin/node

// This script overrides all package-lock.json dependency version with exact versions

"use strict";

const FS = require("fs");
const file = require("path").resolve(__dirname, "package-lock.json");

// Read file
const PackageData = JSON.parse(FS.readFileSync(file).toString());

function replaceVersion(vernum, depName, pkgName, rootData) {
    while (vernum.length > 0 && !(/^[0-9]$/).test(vernum.charAt(0))) {
        vernum = vernum.substr(1);
    }

    if ((/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/).test(vernum)) {
        return vernum;
    } else {
        if (rootData.packages["node_modules/" + depName]) {
            return rootData.packages["node_modules/" + depName].version;
        } else {
            console.log("WARNING: Version need to be manually set in the package '" + pkgName + "' for dependency '" + depName + "'");
            return "REPLACEME";
        }
    }
}

function applyChanges(data, rootData) {
    if (!data || typeof data !== "object") {
        return;
    }
    for (let pkgName of Object.keys(data)) {
        const pkgData = data[pkgName];

        if (typeof pkgData !== "object") {
            continue;
        }

        const pkgDependencies = pkgData.dependencies;
        applyChanges(pkgDependencies, rootData);

        if (typeof pkgDependencies === "object") {
            for (let depName of Object.keys(pkgDependencies)) {
                const dep = pkgDependencies[depName];
                if (typeof dep === "string") {
                    pkgDependencies[depName] = replaceVersion(dep, depName, pkgName, rootData);
                }
            }
        }

        const pkgRequires = pkgData.requires;
        applyChanges(pkgRequires, rootData);
        if (typeof pkgRequires === "object") {
            for (let depName of Object.keys(pkgRequires)) {
                const dep = pkgRequires[depName];
                if (typeof dep === "string") {
                    pkgRequires[depName] = replaceVersion(dep, depName, pkgName, rootData);
                }
            }
        }
    }
}

// Change versions
applyChanges(PackageData.packages, PackageData);

// Write file
FS.writeFileSync(file, JSON.stringify(PackageData, null, 2));
