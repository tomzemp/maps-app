import { getInstance as getD2 } from 'd2';
import { getEarthEngineLayer } from '../constants/earthEngine';
import { getPeriodFromFilter } from '../util/earthEngine';
import { getOrgUnitsFromRows } from '../util/analytics';
import { getDisplayProperty } from '../util/helpers';
import { toGeoJson } from '../util/map';

// Returns a promise
const earthEngineLoader = async config => {
    const { filter, rows, aggregationType } = config;
    let layerConfig = {};
    let dataset;
    let features;

    if (rows) {
        const d2 = await getD2();
        const displayProperty = getDisplayProperty(d2).toUpperCase();
        const orgUnits = getOrgUnitsFromRows(rows);
        const orgUnitParams = orgUnits.map(item => item.id);

        features = await d2.geoFeatures
            .byOrgUnit(orgUnitParams)
            .displayProperty(displayProperty)
            .getAll()
            .then(toGeoJson);
    }

    if (typeof config.config === 'string') {
        // From database as favorite
        layerConfig = JSON.parse(config.config);

        // Backward compability for temperature layer (could also be fixed in a db update script)
        if (layerConfig.id === 'MODIS/MOD11A2' && layerConfig.filter) {
            const period = layerConfig.image.slice(-10);
            layerConfig.id = 'MODIS/006/MOD11A2';
            layerConfig.image = period;
            layerConfig.filter[0].arguments[1] = period;
        }

        dataset = getEarthEngineLayer(layerConfig.id);

        if (dataset) {
            dataset.datasetId = layerConfig.id;
            delete layerConfig.id;
        }

        delete config.config;
    } else {
        dataset = getEarthEngineLayer(layerConfig.id);
    }

    const layer = {
        ...config,
        ...layerConfig,
        ...dataset,
    };

    const { name, unit, description, source, sourceUrl, band, bands } = layer;
    const period = getPeriodFromFilter(filter);

    const groups =
        band && Array.isArray(bands)
            ? bands
                  .filter(b =>
                      Array.isArray(band) ? band.includes(b.id) : band === b.id
                  )
                  .map(b => b.name)
            : null;

    layer.legend = {
        title: name,
        period: period ? period.name : null,
        groups,
        unit,
        description,
        source,
        sourceUrl,
        ...layer.legend,
    };

    // Create legend items from params
    if (!layer.legend.items && layer.params) {
        layer.legend.items = createLegend(layer.params);
    }

    return {
        ...layer,
        data: features,
        aggregationType,
        isLoaded: true,
        isExpanded: true,
        isVisible: true,
    };
};

// TODO: This function is currently duplicated from maps-gl
export const createLegend = params => {
    const min = params.min;
    const max = params.max;
    const palette = params.palette.split(',');
    const step = (params.max - min) / (palette.length - (min > 0 ? 2 : 1));

    let from = min;
    let to = Math.round(min + step);

    return palette.map((color, index) => {
        const item = {
            color: color,
        };

        if (index === 0 && min > 0) {
            // Less than min
            item.name = '< ' + min;
            to = min;
        } else if (from < max) {
            item.name = from + ' - ' + to;
        } else {
            // Higher than max
            item.name = '> ' + from;
        }

        from = to;
        to = Math.round(min + step * (index + (min > 0 ? 1 : 2)));

        return item;
    });
};

export default earthEngineLoader;
