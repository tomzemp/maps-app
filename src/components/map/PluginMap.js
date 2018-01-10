import React, { Component } from 'react';
import PropTypes from 'prop-types';
import d2map from 'dhis2-gis-api/src';
import Layer from './Layer';
import EventLayer from './EventLayer';
import FacilityLayer from './FacilityLayer';
import ThematicLayer from './ThematicLayer';
import BoundaryLayer from './BoundaryLayer';
import EarthEngineLayer from './EarthEngineLayer';
import ExternalLayer from './ExternalLayer';
import { defaultBasemaps } from '../../constants/basemaps';
import { getMapAlerts } from '../../util/helpers'
import '../../../scss/app.scss';

const layerType = {
    event:       EventLayer,
    facility:    FacilityLayer,
    thematic:    ThematicLayer,
    boundary:    BoundaryLayer,
    earthEngine: EarthEngineLayer,
    external:    ExternalLayer
};

// TODO: Resuse code from Map.js
class PluginMap extends Component {

    getChildContext() {
        return {
            map: this.map
        };
    }

    constructor(props, context) {
        super(props, context)

        // Create map div
        const div = document.createElement('div');
        div.style.width = '100%';
        div.style.height = '100%';

        this.map = d2map(div);
    }

    componentWillMount() {
        // this.context.map.on('contextmenu', this.onRightClick, this);
    }

    componentDidMount() {
        if (this.node) { // If map is rendered
            const { bounds, latitude, longitude, zoom } = this.props;
            const map = this.map;


            this.node.appendChild(map.getContainer()); // Append map container to DOM

            // Add zoom control
            map.addControl({
                type: 'zoom',
                position: 'topright',
            });

            if (map.legend) {
                map.addControl({
                    type: 'legend',
                    offset: [0, -64],
                    content: map.legend,
                });
            }

            map.invalidateSize();

            const layersBounds = map.getLayersBounds();

            if (layersBounds.isValid()) {
                map.fitBounds(layersBounds);
            }

            /* TODO
            if (Array.isArray(bounds)) {
                map.fitBounds(bounds);
            } else if (isNumeric(latitude) && isNumeric(longitude) && isNumeric(zoom)) {
                map.setView([latitude, longitude], zoom);
            }*/
        }
     }

    componentDidUpdate(prevProps) {
        this.context.map.invalidateSize();
    }

    // Remove map
    componentWillUnmount() {
        this.context.map.remove();
    }

    render() {
        const { basemap = { id: 'osmLight' }, mapViews } = this.props;
        let selectedBasemap;

        if (basemap.url) { // External layer
            selectedBasemap = {
                id: basemap.id,
                config: {
                    type: 'tileLayer',
                    ...basemap,
                },
            }
        } else {
            selectedBasemap = defaultBasemaps.filter(map => map.id === basemap.id || basemap)[0];
        }

        const alerts = getMapAlerts(this.props);

        const style = {
            width: '100%',
            height: '100%',
        };

        return (!alerts.length ?
            <div ref={node => this.node = node} style={style}>
                {mapViews.filter(layer => layer.isLoaded).map((config) => {
                    const Overlay = layerType[config.layer] || Layer;

                    return (
                        <Overlay
                            key={config.id}
                            // openContextMenu={openContextMenu}
                            {...config}
                            isPlugin={true}
                        />
                    )
                })}
                <Layer key='basemap' {...selectedBasemap} />
            </div>
            :
            <div style={{ padding: 20 }}>
                {alerts.map((alert, index) =>
                    <div key={index}><strong>{alert.title}</strong>: {alert.description}</div>
                )}
            </div>
        )
    }
}

PluginMap.childContextTypes = {
    map: PropTypes.object.isRequired,
};

export default PluginMap;
