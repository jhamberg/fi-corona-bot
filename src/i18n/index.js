const formatters = {
    en: require("./en"),
    fi: require("./fi")
};

function getLanguage(lang) {
    switch (lang.toLowerCase()) {
        case "fi":
        case "fin":
        case "finnish":
        case "suomi":
        case "finska":
            return "fi";
        default:
            return "en";
    }
}

function shouldUpdateLanguage(command, args) {
    switch (command.toLowerCase()) {
        case "language":
        case "lang":
            return !!args.length;
        default:
            return false;
    }
}

function formatResponses(format) {
    return {
        fi: formatters.fi(format),
        en: formatters.en(format)
    };
}

const defaultFormat = {
    bold: (message) => `**${message}**`,
    italic: (message) => `_${message}_`,
    // This is for telegram, which automatically formats any large number as a phonenumber
    number: (num) => num.toLocaleString("en-GB").replace(/,/g, "\u200C ").replace(/\./, "\u200C."),
    lineBreak: "", 
    prefix: "!",
};

function create(customFormat = defaultFormat) {
    const format = Object.assign({}, defaultFormat, customFormat);
    const languages = formatResponses(format);
    const defaultLanguage = languages.english;

    return (command, args, lang) => {
        const language = languages[lang];
        if (language) {
            return language(command, args);
        } else {
            return defaultLanguage(command, args);
        }
    };
}

module.exports = { create, shouldUpdateLanguage, getLanguage };