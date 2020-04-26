const axios = require("axios");
const logger = require("./logger");

function* cartesianProduct(current) {
    const [dimension, ...dimensions] = current;
    for (const point of dimension) {
        if (dimensions.length) {
            for (const rest of cartesianProduct(dimensions)) {
                yield Array.of(point).concat(rest);
            }
        } else {
            yield Array.of(point);
        }
    }
}

function* enumerate(iterable) {
    let index = 0;
    for (const value of iterable) {
        yield [index, value];
        index += 1;
    }
}

function* range(start, end = start) {
    for (let i = start; i < end; i++) {
        yield i;
    }
}

function createAPI(api) {
    return {
        download: async (column, rows = []) => {
            let url = `${api}?row=${rows.join("&row=")}&column=${column}`;
            logger.debug(`Fetching data from ${url}`);
            const response = await axios.get(url);
            const { dataset } = response.data;
            const dimIds = dataset.dimension.id;
            const dimRanges = dataset.dimension.size.map(size => [...range(0, size)]);
            const valueRange = dimRanges.pop();
            const category = {};

            for (const id of dimIds) {
                const dimension = dataset.dimension[id];
                const zipped = Object
                    .entries(dimension.category.index)
                    .map(([identifier, index]) => {
                        const label = dimension.category.label[identifier];
                        return [index, label];
                    });
                category[id] = Object.fromEntries(zipped);
            }

            
            const entries = [];
            const measureId = dimIds.pop();
            const points = dimRanges.length
                ? cartesianProduct(dimRanges) 
                : Array.of([]);

            for (const [offset, multipoint] of enumerate(points)) {
                const values = {};

                // Get the values
                let hasValue = false;
                for (const point of valueRange) {
                    const index = offset * valueRange.length + point;
                    const value = dataset.value[index];
                    if (!value) {
                        continue;
                    }

                    hasValue = true;
                    const name = category[measureId][point];
                    values[name] = value;
                }

                // Skip all entries without a value
                if (!hasValue) {
                    continue;
                }

                const dimensions = {};

                // Get the dimensions 
                for (const [dimension, point] of multipoint.entries()) {
                    const name = dimIds[dimension];
                    const value = category[name][point];
                    dimensions[name] = value;
                }

                const entry = Object.assign(dimensions, values);
                entries.push(entry);
            }
            return entries;
        }
    };
}

module.exports = { createAPI };