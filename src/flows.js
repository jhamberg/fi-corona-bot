
const leven = require("leven");
const fp = require("lodash/fp");
const { groupBy, head, flow, omit, toPairs, map, join, minBy, reject, last, mapValues } = fp;
const { orderBy, take, find, replace, mapKeys, toArray, filter, includes, isNull } = fp;

exports.formatTopEntries = (object, count, mapper) => flow(
    omit("All areas"),
    mapValues("Number of cases"),
    toPairs,
    reject(([, value]) => isNaN(value)),
    orderBy(last, "desc"),
    take(count),
    map(([key, value]) => mapper(key, value)),
    join("\n")
)(object);

exports.mapAges = flow(
    groupBy("ttr10yage"),
    mapValues(find(["sex", "All sexes"])),
    mapValues("Number of cases"),
    mapValues(parseInt)
);

exports.mapSexes = flow(
    groupBy("sex"),
    mapValues(find(["ttr10yage", "All ages"])),
    mapValues("Number of cases"),
    mapValues(parseInt)
);

exports.mapAreas = flow(
    groupBy("hcdmunicipality2020"),
    mapValues(head),
    mapKeys(replace(/\sHospital District$/g, "")),
    mapValues(omit("hcdmunicipality2020")),
    mapValues(mapValues(parseInt)),
);

exports.mapDays = flow(
    groupBy("dateweek2020010120201231"),
    mapValues(head),
    mapValues(omit("dateweek2020010120201231"))
);

exports.formatAgeGroups = (object, mapper) => flow(
    omit("All ages"),
    toPairs,
    map(([key, value]) => {
        const group = key.replace("00", "0").replace(/-$/, "+");
        return mapper(group, value);
    }),
    join("\n")
)(object);

exports.findClosestMatch = (object, search) => flow(
    omit("All areas"),
    toPairs,
    minBy(([key]) => {
        let min = leven(key.toLowerCase(), search);
        for (const word of [...key.split(" "), ...key.split("-")]) {
            const dist = leven(word.toLowerCase(), search);
            min = Math.min(dist, min);
        }
        return min;
    })
)(object);

exports.findDate = flow(
    toArray,
    map("textContent"),
    filter(includes("kuolemantapaukset erityisvastuualueittain")),
    map(text => text.match(/(\d{1,2}).(\d{1,2}). klo (\d{1,2}).(\d{1,2})/)),
    reject(isNull),
    map(([, day, month, hours, minutes]) => {
        const year = new Date().getFullYear();
        return new Date(year, month - 1, day, hours, minutes).toISOString();
    }),
    head
);