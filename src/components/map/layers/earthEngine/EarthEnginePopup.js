import React from 'react';
import PropTypes from 'prop-types';
import Popup from '../../Popup';
import { numberPrecision } from '../../../../util/numbers';
import { getEarthEngineAggregationType } from '../../../../constants/aggregationTypes';
import styles from './styles/EarthEnginePopup.module.css';

const EarthEnginePopup = props => {
    const { coordinates, feature, data, classes, legend, onClose } = props;
    const { id, name } = feature.properties;
    const { title, period = '', unit, items = [] } = legend;
    const values = data[id];
    const valueFormat = numberPrecision(2); // TODO configurable
    const postfix = '%'; // TODO configurable
    let rows = [];

    if (values) {
        if (classes) {
            rows = items
                .filter(i => values[i.id])
                .sort((a, b) => values[b.id] - values[a.id])
                .map(({ id, name, color }) => (
                    <tr key={id}>
                        <td
                            className={styles.color}
                            style={{
                                backgroundColor: color,
                            }}
                        ></td>
                        <td className={styles.name}>{name}</td>
                        <td>
                            {valueFormat(values[id])}
                            {postfix}
                        </td>
                    </tr>
                ));
        } else {
            rows = Object.keys(values).map(type => (
                <tr key={type}>
                    <th>{getEarthEngineAggregationType(type)}:</th>
                    <td>{valueFormat(values[type])}</td>
                </tr>
            ));
        }
    }

    return (
        <Popup
            coordinates={coordinates}
            onClose={onClose}
            className="dhis2-map-popup-orgunit"
        >
            <div className={styles.title}>{name}</div>
            {values && (
                <table className={styles.table}>
                    <caption>
                        {title} {period}
                        {unit && <div className={styles.unit}>{unit}</div>}
                    </caption>
                    <tbody>{rows}</tbody>
                </table>
            )}
        </Popup>
    );
};

EarthEnginePopup.propTypes = {
    coordinates: PropTypes.array.isRequired,
    feature: PropTypes.object.isRequired,
    data: PropTypes.object.isRequired,
    classes: PropTypes.bool,
    legend: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default EarthEnginePopup;
