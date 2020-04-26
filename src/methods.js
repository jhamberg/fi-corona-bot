const flows = require("./flows");
const logger = require("./logger");
const helpers = require("./helpers");
const state = require("./state");

exports.createMethods = (api, crawler) => {
    return {
        getStats: async () => {
            try {
                const [stats] = await api.download("measure-444833.445356");
                const cases = stats["Number of cases"];
                const tests = stats["Number of tests"];
                if (cases !== state.cases || tests !== state.tests) {
                    state.cases = stats["Number of cases"];
                    state.tests = stats["Number of tests"];
                    const closestTime = helpers.roundToNearest(new Date(), state.updateInterval);
                    state.lastUpdated = closestTime.toISOString();
                }
                return true;
            } catch (error) {
                logger.error("Failed fetching total cases and tests");
                logger.error(error);
                return false;
            }
        },
        getDemographics: async () => {
            try {
                const demographics = await api.download("measure-444833.", [
                    "sex-444328L",
                    "ttr10yage-444309"
                ]);
                state.sexes = flows.mapSexes(demographics);
                state.ages = flows.mapAges(demographics);
                return true;
            } catch (error) {
                logger.error("Failed fetching demographics");
                logger.error(error);
                return false;
            }
        },
        getHealthcareDistricts: async () => {
            try {
                const hcds = await api.download("measure-444833L", [
                    "hcdmunicipality2020-445222L"
                ]);
                state.hcds = flows.mapAreas(hcds);
                return true;
            } catch (error) {
                logger.error("Failed fetching daily hcd statistics");
                logger.error(error);
                return false;
            }
        },
        getMunicipalities: async () => {
            try {
                const municipalities = await api.download("measure-445344.444833", [
                    "hcdmunicipality2020-445268L"
                ]);
                state.municipalities = flows.mapAreas(municipalities);
                return true;
            } catch (error) {
                logger.error("Failed fetching municipalities");
                logger.error(error);
                return false;
            }
        },
        getDailyStats: async () => {
            try {
                const dailyStats = await api.download("measure-444833.445356", [
                    "dateweek2020010120201231-443702L"
                ]);
                state.dailyStats = flows.mapDays(dailyStats);
                return true;
            } catch (error) {
                logger.error("Failed fetching daily cases and tests");
                logger.error(error);
                return false;
            }
        },
        getPatientStats: async () => {
            try {
                const patients = await crawler.crawlPatients();
                state.patients = patients;
                return true;
            } catch (error) {
                logger.error("Failed crawling patient information");
                logger.error(error);
                return false;
            }
        }
    };
};