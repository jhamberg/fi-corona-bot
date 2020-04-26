const _ = require("lodash");
const state = require("../state");
const { version, author, license, repository } = require("../../package.json");
const { formatAgeGroups, formatTopEntries, findClosestMatch } = require("../flows");

module.exports = (format) => {
    const responses = formatResponses(format);
    return (command, args) => {
        switch (command.toLowerCase()) {
            case "situation":
            case "status":
            case "report":
                return args && args[0]
                    ? responses.getMunicipalities(args)
                    : responses.getSituation();
            case "age":
            case "ages":
                return responses.getAgeGroups();
            case "sex":
            case "sexes":
            case "men":
            case "women":
                return responses.getSexes();
            case "hcd":
            case "hcds":
            case "healthcaredistricts":
            case "healthcare":
                return responses.getHcds(args);
            case "municipality":
            case "mun":
            case "muni":
                return responses.getMunicipalities(args);
            case "about":
            case "author":
            case "github":
            case "info":
            case "source":
            case "sources":
                return responses.getAbout();
            case "language":
            case "lang":
                return args && args[0]
                    ? responses.usage()
                    : responses.langHelp();
            default:
                return responses.usage();
        }
    };
};

function formatResponses(formatter) {
    const { bold, italic, number, prefix, lineBreak } = formatter;
    return {
        getSituation: () => {
            return (
                `${bold("Situation report")}\n` +
                `${timeString(Date.now())}\n` +
                "\n" +
                `🔹 ${bold(number(state.cases))} confirmed cases\n` +
                `🔹 ${bold(number(state.tests))} tests\n` +
                `🔹 ${bold(number(state.patients.all.hospitalized))} in hospital\n` +
                `🔹 ${bold(number(state.patients.all.icu))} in intensive care\n` +
                `🔹 ${bold(number(state.patients.all.deaths))} deaths\n` +
                "\n" +
                `${italic(`Cases updated on ${timeString(state.lastUpdated)}`)}.\n` +
                `${italic(`Patients updated on ${timeString(state.patients.date)}.`)}`
            );
        },
        getAgeGroups: () => {
            return (
                `${bold("Total Cases by Age Group")}\n` +
                `${timeString(Date.now())}\n` +
                "\n" +
                formatAgeGroups(state.ages, (group, count) => {
                    const pct = (100 * count / state.cases).toFixed(1);
                    return `🔹 ${group} years: ${bold(number(count))} ${italic(`(${pct}%)`)}`;
                })
            );
        },
        getSexes: () => {
            const women = state.sexes["Women"];
            const men = state.sexes["Men"];
            const pctWomen = (100 * women / state.cases).toFixed(1);
            const pctMen = (100 * men / state.cases).toFixed(1);

            return (
                `${bold("Total Cases by Sex")}\n` +
                `${timeString(Date.now())}\n` +
                "\n" +
                `🔹 Women: ${bold(number(women))} ${italic(`(${pctWomen}%)`)}\n` +
                `🔹 Men: ${bold(number(men))} ${italic(`(${pctMen}%)`)}`
            );
        },
        getHcds: (args) => {
            const hcds = _.mapKeys(state.hcds, (_ , key) => translateHcd(key));
            if (!args.length) {
                return (
                    `${bold("Healthcare Districts")}\n` +
                    `${timeString(Date.now())}\n` +
                    "\n" +
                    `${formatTopEntries(hcds, 5, (name, count) => {
                        const pct = (100 * count / state.cases).toFixed(1);
                        return `🔹 ${name}: ${bold(number(count))} ${italic(`(${pct}%)`)}`;
                    })}\n` +
                    `${italic(`... and ${_.size(hcds) - 5} more.\n`)}` +
                    "\n" +
                    `${italic("🔎 Search by name:")}\n` +
                    `${italic(`${prefix}hcd <name>`)}`
                );
            }

            const search = args.join(" ");
            const [match, entry] = findClosestMatch(hcds, search.toLowerCase());
            const cases = entry["Number of cases"];
            const tests = entry["Number of tests"];
            const population = entry["Population"];
            const incidence = (100000 * cases / population).toFixed(2);
            const pct = (100 * cases / state.cases).toFixed(1);

            return (
                `Healthcare District: ${bold(match)}\n` +
                `${timeString()}\n` +
                "\n" +
                `🔹 ${bold(number(cases))} confirmed cases ${italic(`(${pct}%)`)}\n` +
                `🔹 ${bold(number(tests))} tests\n` +
                `🔹 Incidence rate of ${number(incidence)}\n` +
                `🔹 Population of ${number(population)}\n`
            );
        },
        getMunicipalities: (args) => {
            const [search] = args;
            if (!search) {
                return (
                    `${bold("Total Cases by Municipality")}\n` +
                    `${timeString(Date.now())}\n` +
                    "\n" +
                    `${formatTopEntries(state.municipalities, 5, (name, count) => {
                        const pct = (100 * count / state.cases).toFixed(1);  
                        return `🔹 ${name}: ${bold(number(count))} ${italic(`(${pct}%)`)}`;
                    })}\n` +
                    `${italic(`... and ${_.size(state.municipalities) - 5} more.\n`)}` +
                    "\n" +
                    `${italic("🔎 Search by name:")}\n` +
                    `${italic(`${prefix}municipality <name>`)}`
                );
            }

            const [match, entry] = findClosestMatch(state.municipalities, search.toLowerCase());
            const cases = entry["Number of cases"];
            const lessThanFive = isNaN(cases);
            const population = entry["Population"];
            const indidence = lessThanFive
                ? "0 - " + (100000 * 4 / population).toFixed(2)
                : (100000 * cases / population).toFixed(2);
            const pct = (100 * cases / state.cases).toFixed(1);

            return (
                `Municipality: ${bold(match)}\n` +
                `${timeString(Date.now())}\n` +
                "\n" +
                `🔹 ${lessThanFive 
                    ? "Less than five cases" 
                    : `${bold(number(cases))} cases ${italic(`(${pct}%)`)}`}\n` +
                `🔹 Incidence rate ${number(indidence)}\n` +
                `🔹 Population of ${number(population)}`
            );
        },
        getAbout: () => {
            return (
                `${bold("About:")}\n` + 
                `Version: ${version}.\n` +
                `Developer: ${author}\n` +
                `License: ${license}\n` +
                `Repository: ${repository.url}\n` +
                "\n" +
                "The chatbot uses data from the public coronavirus API by THL.fi.\n" +
                "\n" +
                italic(
                    "All data is provided is for indicative purposes only. The service is " + 
                    "provided \"as-is\", \"with all faults\" and \"as available\". " +
                    lineBreak + 
                    "There are no guarantees for the accuracy or timeliness of information " + 
                    "available from the service."
                )
            );
        },
        usage: () => {
            return (
                `${bold("Usage:")}\n` +
                `${prefix}situation - Show a situation update\n` +
                `${prefix}age - Total cases by age group\n` +
                `${prefix}sex - Total cases by sex\n` +
                `${prefix}hcd - Stats for healthcare districts\n` +
                `${prefix}municipality - Stats for municipalities\n` +
                `${prefix}usage - Show this message\n` +
                `${prefix}about - Show about\n` +
                `${prefix}lang - Change language`
            );
        },
        langHelp: () => {
            return (
                `${bold("Select a language:")}\n` +
                `${prefix}lang fi - Suomi\n` +
                `${prefix}lang en - English`
            );
        }
    };
}

function timeString(date = Date.now()) {
    return new Date(date).toLocaleString("en-GB", {
        hour12: false,
        day: "numeric",
        month: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function translateHcd(hcd) {
    switch (hcd) {
        case "Helsinki and Uusimaa":
            return "HUS";
        default:
            return hcd;
    }
}