const _ = require("lodash");
const state = require("../state");
const { version, author, license, repository } = require("../../package.json");
const { formatAgeGroups, formatTopEntries, findClosestMatch } = require("../flows");

module.exports = (format) => {
    const responses = formatResponses(format);
    return (command, args) => {
        switch (command.toLowerCase()) {
            case "tilanne":
            case "tilannekatsaus":
                return args && args[0]
                    ? responses.getMunicipalities(args)
                    : responses.getSituation();
            case "ikä":
            case "ika":
            case "iät":
                return responses.getAgeGroups();
            case "sukupuoli":
            case "sukupuolet":
            case "miehet":
            case "naiset":
                return responses.getSexes();
            case "shp":
            case "shpt":
            case "sairaanhoitopiirit":
            case "sairaanhoito":
                return responses.getHcds(args);
            case "kunta":
            case "kunnat":
                return responses.getMunicipalities(args);
            case "about":
            case "tietoa":
            case "tiedot":
            case "lisätietoa":
            case "lisätiedot":
            case "info":
            case "tekijä":
            case "source":
            case "github":
            case "sources":
                return responses.getAbout();
            case "kieli":
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
                `${bold("Tilannekatsaus")}\n` +
                `${timeString()}\n` +
                "\n" +
                `🔹 ${bold(number(state.cases))} varmistettua tapausta\n` +
                `🔹 ${bold(number(state.tests))} testiä\n` +
                `🔹 ${bold(number(state.patients.all.hospitalized))} sairaalahoidossa\n` +
                `🔹 ${bold(number(state.patients.all.icu))} tehohoidossa\n` +
                `🔹 ${bold(number(state.patients.all.deaths))} menehtynyt\n` +
                "\n" +
                `${italic(`Tapaustiedot päivitetty ${timeString(state.lastUpdated, "fi-FI")}`)}.\n` +
                `${italic(`Potilastiedot päivitetty ${timeString(state.patients.date, "fi-FI")}.`)}`
            );
        },
        getAgeGroups: () => {
            return (
                `${bold("Tapaukset ikäryhmittäin")}\n` +
                `${timeString()}\n` +
                "\n" +
                formatAgeGroups(state.ages, (group, count) => {
                    const pct = (100 * count / state.cases).toFixed(1);
                    return `🔹 ${group} vuotiaat: ${bold(number(count))} ${italic(`(${pct}%)`)}`;
                })
            );
        },
        getSexes: () => {
            const women = state.sexes["Women"];
            const men = state.sexes["Men"];
            const pctWomen = (100 * women / state.cases).toFixed(1);
            const pctMen = (100 * men / state.cases).toFixed(1);

            return (
                `${bold("Tapaukset sukupuolittain")}\n` +
                `${timeString(Date.now())}\n` +
                "\n" +
                `🔹 Naiset: ${bold(number(women))} ${italic(`(${pctWomen}%)`)}\n` +
                `🔹 Miehet: ${bold(number(men))} ${italic(`(${pctMen}%)`)}`
            );
        },
        getHcds: (args) => {
            const hcds = _.mapKeys(state.hcds, (_ , key) => translateHcd(key));
            if (!args.length) {
                return (
                    `${bold("Sairaanhoitopiirit")}\n` +
                    `${timeString(Date.now())}\n` +
                    "\n" +
                    `${formatTopEntries(hcds, 5, (name, count) => {
                        const pct = (100 * count / state.cases).toFixed(1);
                        return `🔹 ${name}: ${bold(number(count))} ${italic(`(${pct}%)`)}`;
                    })}\n` +
                    `${italic(`... ja ${_.size(hcds) - 5} lisää.`)}\n` +
                    "\n" +
                    `${italic("🔎 Hae nimellä:")}\n` +
                    `${italic(`${prefix}shp <nimi>`)}`
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
                `Sairaanhoitopiiri: ${bold(`${match}`)}\n` +
                `${timeString()}\n` +
                "\n" +
                `🔹 ${bold(number(cases))} varmistettua tapausta ${italic(`(${pct}%)`)}\n` +
                `🔹 ${bold(number(tests))} testiä\n` +
                `🔹 Ilmaantuvuus ${number(incidence)}\n` +
                `🔹 Väestömäärä ${number(population)}\n`
            );
        },
        getMunicipalities: (args) => {
            const [search] = args;
            if (!search) {
                return (
                    `${bold("Tapaukset kunnittain")}\n` +
                    `${timeString()}\n` +
                    "\n" +
                    `${formatTopEntries(state.municipalities, 5, (name, count) => {
                        const pct = (100 * count / state.cases).toFixed(1);  
                        return `🔹 ${name}: ${bold(count)} ${italic(`(${pct}%)`)}`;
                    })}\n` +
                    `${italic(`... ja ${_.size(state.municipalities) - 5} lisää.`)}\n` +
                    "\n" +
                    `${italic("🔎 Hae nimellä:")}\n` +
                    `${italic(`${prefix}kunta <nimi>`)}`
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
                `Kunta: ${bold(match)}\n` +
                `${timeString()}\n` +
                "\n" +
                `🔹 ${lessThanFive 
                    ? "Alle viisi tapausta" 
                    : `${bold(number(cases))} tapausta ${italic(`(${pct}%)`)}`}\n` +
                `🔹 Ilmaantuvuus ${number(indidence)}\n` +
                `🔹 Väestömäärä ${number(population)}`
            );
        },
        getAbout: () => {
            return (
                `${bold("Lisätietoa:")}\n` + 
                `Versio: ${version}\n` +
                `Kehittäjä: ${author}\n` +
                `Lisenssi: ${license}\n` +
                `Lähdekoodi: ${repository.url}\n` +
                "\n" +
                "Tiedot haetaan käyttäen THL.fi -sivuston julkista rajapintaa.\n" +
                "\n" +
                italic(
                    "Kaikki tieto on tarkoitettu vain suuntaa antavaksi. Palvelu tarjotaan " + 
                    "\"sellaisena kun sen on\", \"kaikkine vikoineen\" ja \"kun saatavilla\". " +
                    lineBreak + 
                    "Palvelun toiminnasta, tietojen paikkansapitävyydestä tai datan " + 
                    "ajankohtaisuudesta ei anneta mitään takuita tai vakuutuksia."
                )
            );
        },
        usage: () => {
            return (
                `${bold("Komennot:")}\n` +
                `${prefix}tilanne - Näytä tilannekatsaus\n` +
                `${prefix}ika - Tapaukset ikäryhmittäin\n` +
                `${prefix}sukupuoli - Tapaukset sukupuolittain\n` +
                `${prefix}shp - Tapaukset sairaanhoitopiireittäin\n` +
                `${prefix}kunta - Kuntakohtaiset tapaukset\n` +
                `${prefix}ohje - Näytä tämä viesti\n` +
                `${prefix}tietoa - Näytä tietoa botista\n` +
                `${prefix}lang - Vaihda kieltä`
            );
        },
        langHelp: () => {
            return (
                `${bold("Valitse kieli:")}\n` +
                `${prefix}lang fi - Suomi\n` +
                `${prefix}lang en - English`
            );
        }
    };
}

function timeString(date = Date.now()) {
    return new Date(date).toLocaleString("fi-FI", {
        hour12: false,
        day: "numeric",
        month: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function translateHcd(hcd) {
    switch (hcd) {
        case "Åland":
            return "Ahvenanmaa";
        case "South Karelia":
            return "Etelä-Karjala";
        case "North Karelia":
            return "Pohjois-Karjala";
        case "Central Finland":
            return "Keski-Suomi";
        case "South Ostrobothnia":
            return "Etelä-Pohjanmaa";
        case "Central Ostrobothnia":
            return "Keski-Pohjanmaa";
        case "North Ostrobothnia":
            return "Pohjois-Pohjanmaa";
        case "Helsinki and Uusimaa":
            return "HUS";
        default:
            return hcd;
    }
}